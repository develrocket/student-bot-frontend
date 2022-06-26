const express = require('express');
const moment = require('moment');

const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const StudentModel = require('../models/student');
const axios = require('axios').default;
const Utils = require('../helpers/utils');
const StudentPointHistoryModel = require('../models/studentPointHistory');

module.exports = function(){

    return {
        index: async function(req, res) {
            let tab = req.query.tab || 'top';

            res.locals = {...res.locals, title: 'Rank', moment };

            console.log('my-rank:', tab);

            if (tab === 'top') {

                let period = req.query.period || 0;
                let aggregateOptions = [
                    {
                        $group:
                            {
                                _id: "$telegramId",
                                sum_point: { $sum: "$point" },
                                username: {$first: '$username'},
                            }
                    }
                ];

                if (period * 1 > 0) {
                    let subdays = [0, 7, 30];
                    let end = moment().format('YYYY-MM-DD') + ' 23:59:59';
                    let start = moment().subtract(subdays[period - 1],'d').format('YYYY-MM-DD') + ' 00:00:00';

                    aggregateOptions.push({
                        $match: { created_at: {$gte: start} }
                    });
                }

                let students = await StudentPointHistoryModel.aggregate(aggregateOptions);

                let results = [];
                for (let i = 0; i < students.length; i ++) {
                    let item = students[i];
                    let user = await StudentModel.findOne({telegramId: item._id});
                    if (user) {
                        item.countryCode = user.countryCode;
                    } else {
                        item.countryCode = 'af';
                    }
                    item.title = await Utils.getTitle(item.sum_point);
                    results.push(item);
                }


                results = results.sort((a, b) => b.sum_point - a.sum_point);

                res.render('Rank/' + tab, {results, period});
            } else if (tab === 'mine') {
                let searchQuery = {};
                let startSessionNo = 0;

                let subdays = [0, 7, 30];
                let labels = ['Today', 'Last 7 days', 'Last 30 days'];
                let myTelegramId = res.locals.user.telegramId;
                let fResults = [];

                for (let i = 0; i < 3; i ++) {
                    // let end = moment().add('days', 5).format('YYYY-MM-DD') + ' 23:59:59';
                    let start = moment().subtract(subdays[i],'d').format('YYYY-MM-DD');
                    let sessions = await SessionModel.find({session_start: {$gte: start}}).sort({session_no: 1}).lean().exec();
                    let sessionNos = sessions.map(item => item.session_no);

                    let results = await ResultModel.aggregate([
                        {
                            $match: { session_no: {$in: sessionNos} }
                        },
                        {
                            $group: { _id: "$telegramId", totalPoints: { $sum: "$session_points" } }
                        }
                    ]);

                    let myTelegramId = res.locals.user.telegramId;
                    let points = [];
                    let myPoint = 0;

                    for (let j = 0; j < results.length;j ++) {

                        if (results[j]._id + '' === myTelegramId + '') {
                            myPoint = results[j].totalPoints;
                        }
                        if (points.indexOf(results[j].totalPoints) < 0) {
                            points.push(results[j].totalPoints)
                        }
                    }
                    points.sort((a, b) => b - a);

                    fResults.push({
                        label: labels[i],
                        totalPoint: myPoint,
                        totalRank: points.indexOf(myPoint) + 1
                    });
                }

                res.render('Rank/' + tab, {results: fResults});
            } else {
                let period = req.query.period || 1;
                let periods = [7, 30, 90];

                let searchQuery = {};
                let subday = periods[period * 1 - 1];
                let labels = [];
                let results = [];
                let myTelegramId = res.locals.user.telegramId;

                for (let i = subday - 1; i >= 0; i --) {
                    labels.push(moment().subtract(i,'d').format('MM/DD'));
                    let end = moment().subtract(i,'d').format('YYYY-MM-DD') + ' 23:59:59';
                    let sessions = await SessionModel.find({session_start: {$lte: end}}).sort({session_no: -1}).lean().exec();
                    console.log(sessions.length, end);
                    if (sessions.length > 0) {
                        let lastSessionNo = sessions[0]
                        let aResults = await ResultModel.aggregate([
                            {
                                $match: { session_no: {$lte: lastSessionNo.session_no} }
                            },
                            {
                                $group: { _id: "$telegramId", totalPoints: { $sum: "$session_points" } }
                            }
                        ]);

                        let points = [];
                        let myPoint = 0;
                        for (let j = 0; j < aResults.length; j ++) {
                            if (points.indexOf(aResults[j].totalPoints.toFixed(2)) < 0) points.push(aResults[j].totalPoints.toFixed(2));
                            if (aResults[j]._id + '' === myTelegramId + '') myPoint = aResults[j].totalPoints.toFixed(2);
                        }
                        points.sort((a, b) => a - b);
                        results.push(points.indexOf(myPoint) + 1);
                    } else {
                        results.push(0);
                    }
                }

                res.render('Rank/' + tab, {results, period, labels});
            }
        }
        ,
    };

};
