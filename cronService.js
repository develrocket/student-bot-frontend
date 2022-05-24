const axios = require('axios').default;
const SessionModel = require('./models/sessionResult');
const ResultModel = require('./models/studentResult');
const TitleModel = require('./models/studentTitle');
const Utils = require('./helpers/utils');

const serverUrl = 'http://my.loc/test/';
// const serverUrl = 'https://vmi586933.contaboserver.net/';

const fetchSession = async function() {
    let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
    let lastId = sessions.length > 0 ? sessions[0].session_no : 0;
    console.log('fetch-session-lastId:', lastId);
    let newSessionNos = [];
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
            await newSessionItem.save();

            newSessionNos.push(sessionItem.sess_id);
        }
    } catch (err) {
        console.log(err);
    }

    return newSessionNos;
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
                session_points: point
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
            rItem.fortuna_points = (points.indexOf(rItem.session_points) + 1) * 0.1;

            let totalPoint = rItem.session_points;
            let totalFortuna = rItem.fortuna_points;
            for (let j = 0; j < oldResults.length; j ++) {
                if (oldResults[j]._id + '' === rItem.telegramId + '') {
                    totalPoint += oldResults[j].totalPoints
                    totalFortuna += oldResults[j].totalFortuna;
                }
            }
            const title = await Utils.getTitle(totalFortuna);

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
        }


    } catch (err) {
        console.log(err);
    }
}

module.exports = function(){
    return {
        start: async function() {
            let newSessIds = await fetchSession();

            if (newSessIds.length > 0) {
                let lastIds = [].concat(newSessIds);

                for (let i = 0; i < lastIds.length; i ++) {
                    await fetchResult(lastIds[0]);
                }

                console.log('-----> finished get result');
            }
        },
    };
};
