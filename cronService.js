const axios = require('axios').default;
const SessionModel = require('./models/sessionResult');
const ResultModel = require('./models/studentResult');
const TitleModel = require('./models/studentTitle');
const FortunaHistoryModel = require('./models/fortunaHistory');
const Utils = require('./helpers/utils');
const moment = require('moment');
const NewsModel = require('./models/news');
const SkillModel = require('./models/skill');
const SkillHistoryModel = require('./models/skillHistory');
const MissionModel = require('./models/mission');
const MissionHistoryModel = require('./models/missionHistory');

// const serverUrl = 'http://my.loc/test/';
const serverUrl = 'https://vmi586933.contaboserver.net/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// const groupId = -1001495582810;
const groupId = -518755245;

const fetchSession = async function(io) {
    let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
    let lastId = sessions.length > 0 ? sessions[0].session_no : 8696;
    lastId --;
    let newSessionIds = [];
    // console.log('fetch-session-lastId:', lastId);
    try {
        let config = {
            method: 'get',
            url: serverUrl + '/fetch-session.php?session_no=' + lastId,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        let res = await axios(config);
        // console.log(res);

        for (const sessionItem of res.data) {
            let newSessionItem = await SessionModel.find({session_no: sessionItem.sess_id}).lean().exec();

            // console.log('===>', sessionItem.sess_id, newSessionItem);

            if (newSessionItem.length > 0) {
                newSessionItem = newSessionItem[0];
            } else {
                newSessionItem = new SessionModel();
                newSessionItem.session_name = sessionItem.name;
                newSessionItem.session_no = sessionItem.sess_id;
                newSessionItem.session_start = sessionItem.start_time;
                newSessionItem.questions_no = sessionItem.questions;
                newSessionItem.level = sessionItem.level;
                // newSessionItem.delivered = sessionItem.delivered;
                newSessionItem.delivered = 0;
                await newSessionItem.save();
            }

            // console.log(newSessionItem);


            if (newSessionItem.delivered * 1 === 0 || !newSessionItem.delivered) {
                if (!newSessionItem._id) {
                    let content = 'Tournament ' + newSessionItem.session_name + ' started! Level:' + newSessionItem.level + ' Questions:' + newSessionItem.questions_no;
                    io.emit('news_updated', { content: content });

                    let news = new NewsModel({
                        content: content,
                        status: 0
                    });
                    await news.save();
                }
                newSessionIds.push(sessionItem.sess_id);
            }
        }
    } catch (err) {
        console.log(err);
    }

    return newSessionIds;
}

const fetchResult = async function(sessId, skills, bot) {
    try {
        let config = {
            method: 'get',
            url: serverUrl + '/student-result.php?session_no=' + sessId,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        let res = await axios(config);

        let rItems = [];
        let points = [];
        let telegramIds = [];

        for (const rItem of res.data) {
            let a = rItem.username;
            let username = ((a.split('">')[1]).split('</')[0]).trim();
            let point = rItem.correct * 1;
            if (telegramIds.indexOf(rItem.user_id + '') >= 0) continue;
            telegramIds.push(rItem.user_id + '');
            rItems.push({
                telegramId: rItem.user_id + '',
                username: username,
                session_no: rItem.session_id,
                session_points: point,
                session_wrong_points: rItem.incorrect,
                date: rItem.date
            });

            if (points.indexOf(point) < 0) {
                points.push(point);
            }
        }
        points.sort((a, b) => b - a);
        const session = await SessionModel.findOne({session_no: sessId});

        let skill = '';
        for (let i =  0; i < skills.length; i ++) {
            if (session.session_name.toLowerCase().indexOf(skills[i]) >= 0) {
                skill = skills[i];
                break;
            }
        }

        let oldResults = await ResultModel.aggregate([
            {
                $match: { session_no: {$lt: sessId * 1} }
            },
            {
                $group:
                    {
                        _id: "$telegramId",
                        totalPoints: { $sum: "$session_points" },
                        totalFortuna: { $sum: "$fortuna_points" }
                    }
            }
        ]);

        for (let i = 0; i < rItems.length; i ++) {
            let rItem = rItems[i];
            rItem.session_rank = points.indexOf(rItem.session_points) + 1;
            rItem.fortuna_points = rItem.session_points * 0.1;

            let totalPoint = rItem.session_points;
            let totalFortuna = rItem.fortuna_points;
            for (let j = 0; j < oldResults.length; j ++) {
                if (oldResults[j]._id + '' === rItem.telegramId + '') {
                    totalPoint += oldResults[j].totalPoints
                    totalFortuna += oldResults[j].totalFortuna;
                }
            }
            const title = await Utils.getTitle(totalPoint);

            rItem.title = title;
            rItem.sum_point = totalPoint;
            rItem.total_fortuna_user = totalFortuna;
            rItem.session = session._id;

            let results = await ResultModel.find({session_no: sessId, telegramId: rItem.telegramId});
            if (results.length > 0) {
                if (results[0].title != title) {
                   bot.sendMessage(groupId, '🔥Congratulations fellow African <a href="tg://user?id=' + rItem.telegramId+ '">' + rItem.username + '</a>! 🦇 You have just been promoted to <b>' + title +'</b>!', {parse_mode: 'Html'});
                }
                await ResultModel.update({_id: results[0]._id}, {
                    $set: rItem
                })
            } else {
                let item = new ResultModel(rItem);
                await item.save();

                let prevResults = await ResultModel.find({session_no: {$lt: sessId}, telegramId: rItem.telegramId}).sort({session_no: -1}).lean().exec();
                if (prevResults[0].title != title) {
                    bot.sendMessage(groupId, '🔥Congratulations fellow African <a href="tg://user?id=' + rItem.telegramId+ '">' + rItem.username + '</a>! 🦇 You have just been promoted to <b>' + title +'</b>!', {parse_mode: 'Html'});
                }

                await SessionModel.update({
                    session_no: sessId
                }, {
                    $inc: {
                        playerCount: 1
                    }
                })
            }

            if (skill) {
                let skillHistory = await SkillHistoryModel.find({session_no: sessId, telegramId: rItem.telegramId, skill: skill}).lean().exec();
                if (skillHistory.length > 0) {
                    skillHistory = skillHistory[0];
                    await SkillHistoryModel.update({
                        _id: skillHistory._id
                    }, {
                        $set: {score: rItem.fortuna_points}
                    });
                } else {
                    skillHistory = new SkillHistoryModel({
                        skill: skill,
                        session_no: sessId,
                        telegramId: rItem.telegramId,
                        score: rItem.fortuna_points
                    });
                    await skillHistory.save();
                }
            }

            let lastHistory = await FortunaHistoryModel.find({session_no: sessId, telegramId: rItem.telegramId}).lean().exec();
            if (lastHistory.length > 0) {
                lastHistory = lastHistory[0];
                let newData = {
                    created_at: rItem.date,
                    fortuna_point: rItem.fortuna_points,
                };
                await FortunaHistoryModel.update({
                    _id: lastHistory._id
                }, {
                    $set: newData
                });
            } else {
                let hItem = new FortunaHistoryModel({
                    telegramId: rItem.telegramId,
                    created_at: rItem.date,
                    fortuna_point: rItem.fortuna_points,
                    state: 0,
                    session_no: sessId
                });
                await hItem.save();
            }
        }

        // console.log('---->sessionId: ', sessId, ', ---->get Results:', rItems.length);


    } catch (err) {
        // console.log(err);
    }
}

module.exports = function(){
    return {
        start: async function(io, bot) {
            let lastIds = [];
            let newSessionIds = [];
            let deleteSessionIds = [];
            let firstTeleId = '';
            let skills = await SkillModel.find({}).lean().exec();
            skills = skills.map(item => item.name);

            while(1) {
                let nIds = await fetchSession(io);
                newSessionIds = newSessionIds.concat(nIds);

                // console.log('new-session-ids:', newSessionIds);

                for (let i = 0; i < newSessionIds.length; i ++) {
                    // console.log('======> fetch result session:', newSessionIds[i]);
                    await fetchResult(newSessionIds[i], skills, bot);
                }

                // console.log('-----> finished get result');

                let deleteSessionIds = [];
                for (let i = 0; i < newSessionIds.length; i ++) {
                    let sessId = newSessionIds[i];
                    let session = await SessionModel.findOne({session_no: sessId});

                    let results = await ResultModel.find({session_no: sessId}).sort({session_rank: 1}).lean().exec();
                    if (results.length > 0) {
                        let remaining = session.questions_no * 1 - (results.length > 0 ? results[0].session_points + results[0].session_wrong_points : 0);
                        // console.log('session_remaining:', sessId, remaining);
                        if (remaining > 0) {
                            let content = 'Tournament ' + session.session_name + ' ongoing! Level: ' + session.level + ' Questions: ' + session.questions_no + ' Players: ' + results.length + '.';
                            if (results.length > 0) {
                                content += ' 🥇' + results[0].username + ' ' + results[0].session_points + ' points.'
                            }
                            if (results.length > 1) {
                                content += ' 🥈' + results[1].username + ' ' + results[1].session_points + ' points.'
                            }
                            if (results.length > 2) {
                                content += ' 🥉' + results[2].username + ' ' + results[2].session_points + ' points.'
                            }
                            content += ' Questions remaining ' + (session.questions_no * 1 - (results.length > 0 ? results[0].session_points + results[0].session_wrong_points : 0));
                            io.emit('news_updated', { content: content });
                            let news = new NewsModel({
                                content: content,
                                status: 1
                            });

                            if (firstTeleId != results[0].telegramId) {
                                bot.sendMessage(groupId, '🔥<a href="tg://user?id=' + results[0].telegramId+ '">' + results[0].username + '</a> you are the leader now!', {parse_mode: 'Html'});
                                firstTeleId = results[0].telegramId;
                            }
                            await news.save();
                        } else {
                            // console.log('here-session-end:', sessId);
                            await SessionModel.update({
                                session_no: sessId
                            }, {
                                $set: {
                                    delivered: 1
                                }
                            });

                            let content = 'Tournament ' + session.session_name + ' over. 🥇Winner ' + results[0].username + ' with' + results[0].session_points + '! Congratulations! Stay tuned for the next broadcast!';
                            io.emit('news_updated', { content: content });
                            let news = new NewsModel({
                                content: content,
                                status: 2
                            });
                            await news.save();
                            deleteSessionIds.push(sessId);
                        }

                    } else {
                        if (i < newSessionIds.length -1 ) {
                            deleteSessionIds.push(sessId);
                        }
                    }
                }

                for (let i = 0; i < deleteSessionIds.length;i ++) {
                    newSessionIds.splice(newSessionIds.indexOf(deleteSessionIds[i]), 1);
                }

                if (newSessionIds.length == 0) {
                    io.emit('session_ended', {});
                }

                // console.log('new-session-id-length:', newSessionIds.length);

                await sleep(3000);
            }
        },

        checkMission: async function(bot) {
            while(true) {
                let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
                console.log('current-time:', currentTime);
                let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}, isNoti: {$ne: 1}};
                let missions = await MissionModel.find(searchQuery).lean().exec();

                let missionIds = missions.map(item => item._id);

                console.log(missionIds);

                if (missionIds.length > 0) {
                    bot.sendMessage(groupId, '🔥A new mission is available! Go to <a href="https://myafrica.link/tasks">myafrica.link</a> to check the details!', {parse_mode: 'Html'});
                    await MissionModel.update({
                        _id: {$in: missionIds}
                    }, {
                        $set: {
                            isNoti: 1
                        }
                    }, {multi: true});
                }
                await sleep(60 * 1000);
            }
        },

        checkComplete: async function(bot) {
            while(true) {
                let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
                let searchQuery = {created_at: {$lte: currentTime}, isNoti: {$ne: 1}};
                let missions = await MissionHistoryModel.find(searchQuery).lean().exec();
                let missionIds = missions.map(item => item._id);

                if (missionIds.length > 0) {
                    for (let i = 0; i < missions.length; i ++) {
                        let mission = missions[i];
                        bot.sendMessage(groupId, '🔥Congratulations <a href="tg://user?id=' + mission.telegramId+ '">' + mission.username + '</a>! You completed the mission and unlocked your badge!');
                    }

                    await MissionHistoryModel.update({
                        _id: {$in: missionIds}
                    }, {
                        $set: {
                            isNoti: 1
                        }
                    }, {multi: true});
                }


                await sleep(10 * 1000);
            }
        }
    };
};
