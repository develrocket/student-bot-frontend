const express = require('express');
const router = express.Router();

const StudentResultModel = require('../../models/studentResult');
const SessionModel = require('../../models/sessionResult');
const FortunaHistoryModel = require('../../models/fortunaHistory');
const axios = require('axios').default;
const Utils = require('../../helpers/utils');
const SkillModel = require('../../models/skill');
const StudentModel = require('../../models/student');
const SkillHistoryModel = require('../../models/skillHistory');
const StudentPointHistoryModel = require('../../models/studentPointHistory');
const MissionHistoryModel = require('../../models/missionHistory');
const moment = require('moment');

const serverUrl = 'https://vmi586933.contaboserver.net/';

// const fetchSession = async function() {
//     let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
//     let lastId = sessions.length > 0 ? sessions[0].session_no : 0;
//     try {
//         let config = {
//             method: 'get',
//             url: 'https://fortunaenglish.com/api/fetch/livesession?lastId=' + lastId,
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             }
//         };
//
//         let res = await axios(config);
//
//         for (const sessionItem of res.data) {
//             const newSessionItem = new SessionModel();
//             newSessionItem.language = sessionItem.language;
//             newSessionItem.session_type = sessionItem.type;
//             newSessionItem.session_name = sessionItem.session_name;
//             newSessionItem.session_no = sessionItem.id;
//             newSessionItem.session_start = sessionItem.start_time.replaceAll('/', '-');
//             newSessionItem.questions_no = sessionItem.questions;
//             newSessionItem.level = sessionItem.level;
//             await newSessionItem.save();
//         }
//         console.log('insert-new-session:', res.data.length);
//     } catch (err) {
//         console.log(err);
//     }
// }

const fetchSession = async function(sessId) {

    // console.log('fetch-session-lastId:', lastId);
    try {
        let config = {
            method: 'get',
            url: serverUrl + '/fetch-session-detail.php?session_no=' + sessId,
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
        }
    } catch (err) {
        console.log(err);
    }
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

        const session = await SessionModel.findOne({session_no: sessId});

        if (!session) return;

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


        let oldResults = await StudentResultModel.aggregate([
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

        console.log('fetch-result-points:', points);

        for (let i = 0; i < rItems.length; i ++) {
            let rItem = rItems[i];
            rItem.session_rank = points.indexOf(rItem.session_points) + 1;
            rItem.fortuna_points = rItem.session_points * 0.1;

            let results = await StudentPointHistoryModel.find({telegramId: rItem.telegramId, session_no: rItem.session_no}).lean().exec();
            if (results.length > 0) {
                await StudentPointHistoryModel.update({
                    _id: results[0]._id
                }, {
                    $set: {
                        point: rItem.session_points
                    }
                })
            } else {
                let sp = new StudentPointHistoryModel({
                    telegramId: rItem.telegramId,
                    point: rItem.session_points,
                    created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
                    session_no: sessId
                });
                await sp.save();
            }


            let totalPoint = await StudentPointHistoryModel.aggregate([
                {
                    $match: { telegramId: rItem.telegramId }
                },
                {
                    $group:
                        {
                            _id: "$telegramId",
                            totalPoints: { $sum: "$point" },
                        }
                }
            ]);

            totalPoint = totalPoint.length > 0 ? totalPoint[0].totalPoints : 0;
            const title = await Utils.getTitle(totalPoint);

            rItem.title = title;
            rItem.sum_point = totalPoint;
            rItem.total_fortuna_user = 0;
            rItem.session = session._id;

            await StudentModel.update({
                telegramId: rItem.telegramId,
            }, {
                $set: {
                    point: totalPoint,
                    title: title
                }
            });

            results = await StudentResultModel.find({session_no: sessId, telegramId: rItem.telegramId}).lean().exec();
            if (results.length > 0) {
                if (rItem.session_points == 47) {
                    console.log(rItem);
                }
                await StudentResultModel.update({_id: results[0]._id}, {
                    $set: rItem
                })
            } else {
                let item = new StudentResultModel(rItem);
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

        console.log('---->sessionId: ', sessId, ', ---->get Results:', rItems.length);


    } catch (err) {
        console.log('api-fetch-result-error: ', err);
    }
}


module.exports = function(){

    return {

        resetUserPoint: async function(req, res) {
            let students = await StudentModel.find({});
            for (let i = 0; i < students.length; i ++) {
                let totalPoint = await StudentPointHistoryModel.aggregate([
                    {
                        $match: { telegramId: students[i].telegramId }
                    },
                    {
                        $group:
                            {
                                _id: "$telegramId",
                                totalPoints: { $sum: "$point" },
                            }
                    }
                ]);

                totalPoint = totalPoint.length > 0 ? totalPoint[0].totalPoints : 0;
                const title = await Utils.getTitle(totalPoint);

                await StudentModel.update({
                    _id: students[i]._id
                }, {
                    $set: {
                        title: title,
                        point: totalPoint
                    }
                })
            }

            return res.json({result: 'success'});
        },

        resetSkillScore: async function(req, res) {
            let histories = await SkillHistoryModel.find({mission:{$ne: null}});
            for (let i = 0; i < histories.length; i ++) {
                await SkillHistoryModel.update({
                    _id: histories[i]._id
                }, {
                    $set: {score: 20}
                })
            }

            let results = await StudentResultModel.find({}).populate('session').sort({session_no: 1});
            for (let i = 0; i < results.length; i ++) {
                let item = results[i];
                let createdAt = item.session.session_start;
                let date = createdAt.split(' ')[0];
                let time = createdAt.split(' ')[1];
                let hours = time.split(':')[0];
                let mins = time.split(':')[1];
                hours = hours.length < 2 ? '0' + hours : hours;
                mins = mins.length < 2 ? '0' + mins : mins;
                createdAt = date + ' ' + hours + ':' + mins + ':00';
                let sp = new StudentPointHistoryModel({
                    telegramId: item.telegramId,
                    point: item.session_points,
                    session_no: item.session_no,
                    created_at: createdAt
                });
                await sp.save();
            }

            results = await MissionHistoryModel.find({});
            for (let i = 0; i < results.length; i ++) {
                let item = results[i];
                let sp = new StudentPointHistoryModel({
                    telegramId: item.telegramId,
                    point: 200,
                    created_at: item.created_at
                });
                await sp.save();
            }



            return res.json({result: 'success'});
        },

        insertSkills: async function(req, res) {
            let skills = [
                'religion', 'culture', 'geography', 'mathematics', 'history', 'logic',
                'languages', 'computers', 'zoology', 'literature', 'art', 'biology', 'chemistry',
                'astronomy', 'philosophy', 'science', 'forensic', 'medicine', 'blockchain',
                'ecology', 'geology', 'genetics', 'english'
            ];

            for (let i = 0; i < skills.length; i ++) {
                let skill = new SkillModel({name: skills[i]});
                await skill.save();
            }

            return res.json({result: 'success'});
        },
        getResultBySessNo: async function(req, res) {
            await fetchResult(req.query.sessNo);
            return res.json({result: 'success'});
        },

        getResultAll: async function(req, res) {
            for (let i = 8097; i <= 9081; i ++) {
                console.log('fetch-session-no:', i);
                await fetchSession(i);
                await fetchResult(i);
            }
            return res.json({result: 'success'});
        },

        setPlayerCount: async function(req, res) {
            let sessions = await SessionModel.find({});
            for (let i = 0; i < sessions.length; i ++) {
                let results = await StudentResultModel.find({session_no: sessions[i].session_no}).lean().exec();
                await SessionModel.update({
                    _id: sessions[i]._id
                }, {
                    $set: {
                        playerCount: results.length
                    }
                })
            }
            return res.json({result: "success"});
        },

        getSessionRank: async function(req, res) {
            let sessNo = req.query.sessNo;
            console.log('sessNo:', req.query);
            let results = await StudentResultModel.find({session_no: sessNo}).lean().exec();

            results.sort((a, b) => a.session_rank - b.session_rank);

            for (let j = 0; j < results.length; j ++) {
                let user = await StudentModel.findOne({telegramId: results[j].telegramId});
                results[j].country =  user ? (user.countryCode ? user.countryCode : 'af') : 'af';
            }

            return res.json({result: results});
        },

        getProfile: async function(req, res) {
            let teleId = req.query.id;
            let profileData = await Utils.getProfileData(teleId);

            res.json(profileData);
        },

        setFortunaHistory: async function(req, res) {
            let results = await StudentResultModel.find({}).sort({session_no: 1}).lean().exec();
            let sessions = await SessionModel.find({}).lean().exec();
            let userPoint = {};
            for (let i = 0; i < results.length; i++) {
                let item = results[i];
                if (!userPoint[item.telegramId]) {
                    userPoint[item.telegramId] = 0;
                }

                let session = sessions.filter(sitem => sitem._id + '' === item.session + '');

                userPoint[item.telegramId] += item.fortuna_points;
                let hItem = new FortunaHistoryModel({
                    telegramId: item.telegramId,
                    created_at: session[0].session_start,
                    fortuna_point: item.fortuna_points,
                    // total_point: userPoint[item.telegramId],
                    state: 0,
                    session_no: item.session_no
                });
                await hItem.save();
            }
            return res.json({result: "success"});
        },

        resetFortunaPoint: async function(req, res) {
            let results = await StudentResultModel.find({});
            for (let i = 0; i < results.length; i ++) {
                await StudentResultModel.update({
                    _id: results[i]._id
                }, {
                    $set: {
                        fortuna_points: results[i].session_points * 0.1
                    }
                });
            }
            return res.json({result: "success"});
        },

        resetSessionId: async function(req, res) {
            let results = await StudentResultModel.find({});
            for (let i = 0; i < results.length; i ++) {
                let sessions = await SessionModel.find({session_no: results[i].session_no}).lean().exec();
                if (sessions.length > 0) {
                    await StudentResultModel.update({
                        _id: results[i]._id
                    }, {
                        $set: {
                            session: sessions[0]._id
                        }
                    })
                }
            }
            return res.json({result: "success"});
        },

        resetRank: async function(req, res) {
            let results = await StudentResultModel.find({session_no: req.query.sessNo}).lean().exec();
            let points = [];
            for (let i = 0; i < results.length; i ++) {
                if (points.indexOf(results[i].session_points) < 0) {
                    points.push(results[i].session_points * 1);
                }
            }

            points.sort((a, b) => b - a);

            for (let i = 0; i < results.length; i ++) {
                await StudentResultModel.update({
                    _id: results[i]._id
                }, {
                    $set: {session_rank: points.indexOf(results[i].session_points * 1) + 1}
                });
            }
            return res.json({result: "success"});
        },

        fetchSession: async function(req, res) {
            await fetchSession();
            return res.json({result: "success"});
        },

        filter: async function (req, res) {
            const {telegramId, term} = req.query;
            let filterQuery = {telegramId: telegramId};
            const results = await StudentResultModel.find(filterQuery).sort({session_no: -1}).populate("session");

            if (results.length === 0) {
                return res.json({result: "success", data: []});
            }

            if (term && term !== "") {
                let delta = term === "lastday" ? 1 : term === "lastweek" ? 7 : term === "lastmonth" ? 30 :
                    term === "last3months" ? 90 : 0;
                const now = new Date(results[0].session.session_start);
                const from = now.setDate(now.getDate() - delta);
                const filteredData = results.filter((item) => {
                    return item.session.session_start > from;
                });

                return res.json({result: "success", data: filteredData});
            } else {
                return res.json({result: "success", data: results});
            }
        },

        upRank: async function (req, res) {
            const {telegramId, term} = req.query;
            let filterQuery = {telegramId: telegramId};
            const results = await StudentResultModel.find(filterQuery).sort({session_no: -1}).populate("session");
            if (results.length === 0) {
                return res.json({result: "success", data: []});
            }
            const latestDate = new Date(results[0].session.session_start);
            let currentRank = results[0].session_rank;
            let averageRank = 0;
            let sumRank = 0;

            if (term && term !== "") {
                let delta = term === "lastday" ? 1 : term === "lastweek" ? 7 : term === "lastmonth" ? 30 :
                    term === "last3months" ? 90 : 0;
                const from = latestDate.setDate(latestDate.getDate() - delta);
                const filteredData = results.filter((item) => {
                    return item.session.session_start > from;
                });

                for (const item of filteredData) {
                    sumRank += item.session_rank;
                }
                averageRank = Math.round(sumRank / filteredData.length);

                return res.json({result: "success", data: (currentRank - averageRank)});
            } else {
                return res.json({result: "failed", data: 'wrong parameter'});
            }
        },

        getAllFortuna: async function (req, res) {
            const results = await StudentResultModel.find().sort({session_no: -1});

                // merge all stu
                const studentResult = [];
                for (const item of results) {
                    const filteredId = studentResult.findIndex((stuItem) => item.telegramId === stuItem.telegramId);
                    if (filteredId < 0) {
                        const temp = {
                            username: item.username,
                            telegramId: item.telegramId,
                            title: item.title,
                            total_fortuna_user: item.total_fortuna_user,
                        };
                        studentResult.push(temp);
                    }
                }

                return res.json({result: "success", data: studentResult});
        },

        getInfo: async function (req, res) {
            const {telegramId} = req.query;
            let filterQuery = {telegramId: telegramId};
            const results = await StudentResultModel.find(filterQuery).sort({session_no: -1});

            if (results.length > 0) {
                return res.json({username: results[0].username, telegramId: results[0].telegramId, title: results[0].title,
                    sum_point: results[0].sum_point});
            }
            return res.json({result: "failed", data: "wrong parameter"});
        },

        sort: async function (req, res) {
            const {term} = req.query;
            const results = await StudentResultModel.find().sort({session_no: -1}).populate("session");

            if (results.length === 0) {
                return res.json({result: "success", data: []});
            }

            if (term && term !== "") {
                // filter with term
                let delta = term === "lastday" ? 1 : term === "lastweek" ? 7 : term === "lastmonth" ? 30 :
                    term === "last3months" ? 90 : 0;
                const now = new Date(results[0].session.session_start);
                const from = now.setDate(now.getDate() - delta);
                const filteredData = results.filter((item) => {
                    return item.session.session_start > from;
                });

                // merge & sum all stu point
                const studentResult = [];
                for (const item of filteredData) {
                    const filteredId = studentResult.findIndex((stuItem) => item.telegramId === stuItem.telegramId);
                    if (filteredId < 0) {
                        const temp = {
                            no: item.no,
                            username: item.username,
                            telegramId: item.telegramId,
                            session: item.session,
                            session_no: item.session_no,
                            total_points: item.session_points,
                            session_rank: item.session_rank,
                            fortuna_points: item.fortuna_points,
                            title: item.title,
                            total_fortuna_user: item.total_fortuna_user,
                        };
                        studentResult.push(temp);
                    } else {
                        studentResult[filteredId].total_points = studentResult[filteredId].total_points + item.session_points;
                    }
                }

                // sort records
                studentResult.sort((a, b) => b.total_points - a.total_points);

                return res.json({result: "success", data: studentResult});
            } else {
                return res.json({result: "failed", data: "wrong parameter"});
            }
        },
    };

};
