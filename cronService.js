const axios = require('axios').default;
const SessionModel = require('./models/sessionResult');
const ResultModel = require('./models/studentResult');
const TitleModel = require('./models/studentTitle');
const FortunaHistoryModel = require('./models/fortunaHistory');
const Utils = require('./helpers/utils');
const moment = require('moment');
const NewsModel = require('./models/news');

// const serverUrl = 'http://my.loc/test/';
const serverUrl = 'https://vmi586933.contaboserver.net/';

const fetchSession = async function(io) {
    let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
    let lastId = sessions.length > 0 ? sessions[0].session_no : 8696;
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
            const newSessionItem = new SessionModel();
            newSessionItem.session_name = sessionItem.name;
            newSessionItem.session_no = sessionItem.sess_id;
            newSessionItem.session_start = sessionItem.start_time;
            newSessionItem.questions_no = sessionItem.questions;
            newSessionItem.level = sessionItem.level;
            newSessionItem.delivered = sessionItem.delivered;
            await newSessionItem.save();

            if (newSessionItem.delivered * 1 === 0) {
                let content = 'Tournament ' + newSessionItem.session_name + ' started! Level:' + newSessionItem.level + ' Questions:' + newSessionItem.questions_no;
                io.emit('news_updated', { content: content });
                newSessionIds.push(sessionItem.sess_id);

                let news = new NewsModel({
                    content: content,
                    status: 0
                });
                await news.save();
            }
        }
    } catch (err) {
        console.log(err);
    }

    return newSessionIds;
}

const fetchResult = async function(sessId) {
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

        for (const rItem of res.data) {
            let a = rItem.username;
            let username = ((a.split('">')[1]).split('</')[0]).trim();
            let point = rItem.correct * 1;
            rItems.push({
                telegramId: rItem.user_id,
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

        let oldResults = await ResultModel.aggregate([
            {
                $match: { session_no: {$lt: sessId} }
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
                await ResultModel.update({_id: results[0]._id}, {
                    $set: rItem
                })
            } else {
                let item = new ResultModel(rItem);
                await item.save();

                await SessionModel.update({
                    session_no: sessId
                }, {
                    $inc: {
                        playerCount: 1
                    }
                })
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
        start: function(io) {
            let lastIds = [];
            let newSessionIds = [];
            let deleteSessionIds = [];
            setInterval(async function() {
                let nIds = await fetchSession(io);
                newSessionIds = newSessionIds.concat(nIds);

                for (let i = 0; i < newSessionIds.length; i ++) {
                    // console.log('======> fetch result session:', lastIds[i]);
                    await fetchResult(newSessionIds[i]);
                }

                // console.log('-----> finished get result');

                let deleteSessionIds = [];
                for (let i = 0; i < newSessionIds.length; i ++) {
                    let sessId = newSessionIds[i];
                    let config = {
                        method: 'get',
                        url: serverUrl + '/fetch-session-detail.php?session_no=' + sessId,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    };

                    let res = await axios(config);

                    if (res.data.length > 0) {
                        let session = res.data[0];
                        if (session.delivered * 1 > 0) {
                            await SessionModel.update({
                                session_no: sessId
                            }, {
                                $set: {
                                    delivered: session.delivered
                                }
                            });
                            let results = await ResultModel.find({session_no: sessId}).sort({session_rank: 1}).lean().exec();

                            let content = 'Tournament ' + session.name + ' over. 🥇Winner ' + results[0].username + ' with' + results[0].session_points + '! Congratulations! Stay tuned for the next broadcast!';
                            io.emit('news_updated', { content: content });
                            let news = new NewsModel({
                                content: content,
                                status: 2
                            });
                            await news.save();
                            deleteSessionIds.push(sessId);
                        } else {
                            let results = await ResultModel.find({session_no: sessId}).sort({session_rank: 1}).lean().exec();
                            let content = 'Tournament ' + session.name + ' ongoing! Level: ' + session.level + ' Questions: ' + session.questions + ' Players: ' + results.length + '.';
                            if (results.length > 0) {
                                content += ' 🥇' + results[0].username + ' ' + results[0].session_points + ' points.'
                            }
                            if (results.length > 1) {
                                content += ' 🥈' + results[1].username + ' ' + results[1].session_points + ' points.'
                            }
                            if (results.length > 2) {
                                content += ' 🥉' + results[2].username + ' ' + results[2].session_points + ' points.'
                            }
                            content += ' Questions remaining ' + (session.questions * 1 - (results.length > 0 ? results[0].session_points + results[0].session_wrong_points : 0));
                            io.emit('news_updated', { content: content });
                            let news = new NewsModel({
                                content: content,
                                status: 1
                            });
                            await news.save();
                        }
                    } else {
                        deleteSessionIds.push(sessId);
                    }
                }

                for (let i = 0; i < deleteSessionIds.length;i ++) {
                    newSessionIds.splice(newSessionIds.indexOf(deleteSessionIds[i]), 1);
                }

                if (newSessionIds.length == 0) {
                    io.emit('session_ended', {});
                }
            }, 10000);
        },
    };
};
