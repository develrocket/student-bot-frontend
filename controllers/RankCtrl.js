const express = require('express');
const moment = require('moment');

const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const axios = require('axios').default;

module.exports = function(){

    return {
        index: async function(req, res) {
            let tab = req.query.tab || 'top';

            res.locals = {...res.locals, title: 'Rank', moment };

            console.log('my-rank:', tab);

            if (tab === 'top') {

                let period = req.query.period || 0;

                if (period * 1 > 0) {
                    let subdays = [0, 7, 30];
                    let end = moment().format('YYYY-MM-DD') + ' 23:59:59';
                    let start = moment().subtract(subdays[period - 1],'d').format('YYYY-MM-DD') + ' 00:00:00';

                    let sessions = await SessionModel.find({session_start: {$gte: start, $lte: end}}).sort({session_no: 1}).lean().exec();

                    let results = [];

                    if (sessions.length === 0) {
                        return res.render('Rank/' + tab, {results, period});
                    }

                    let sessionStart = sessions[0].session_no;

                    let students = await ResultModel.aggregate([
                        {
                            $match: { session_no: {$gte: sessionStart} }
                        },
                        {
                            $group:
                                {
                                    _id: "$telegramId",
                                    totalPoints: { $sum: "$session_points" }
                                }
                        }
                    ]);


                    for (let i = 0; i < students.length; i ++) {
                        let item = students[i];
                        let result = await ResultModel.find({telegramId: item._id}).sort({session_no: -1}).lean().exec();
                        result = result[0];
                        let ritem = {
                            username: result.username,
                            telegramId: result.telegramId,
                            sum_point: item.totalPoints,
                            title: result.title,
                        };
                        if (results.length === 0) {
                            results.push(ritem);
                            continue;
                        }
                        let insert = false;
                        for (let j = 0; j < results.length; j ++) {
                            if (results[j].sum_point < ritem.sum_point) {
                                results.splice(j, 0, ritem);
                                insert = true;
                                break;
                            }
                        }
                        if (!insert) {
                            results.push(ritem);
                        }
                    }

                    res.render('Rank/' + tab, {results, period});

                } else {
                    let students = await ResultModel.aggregate([
                        {
                            $group:
                                {
                                    _id: "$telegramId",
                                    maxPoint: { $max: "$sum_point" }
                                }
                        }
                    ]);

                    let results = [];
                    for (let i = 0; i < students.length; i ++) {
                        let item = students[i];
                        let result = await ResultModel.find({telegramId: item._id}).sort({session_no: -1}).lean().exec();
                        result = result[0];
                        let ritem = {
                            username: result.username,
                            telegramId: result.telegramId,
                            sum_point: result.sum_point,
                            title: result.title,
                        };
                        if (results.length === 0) {
                            results.push(ritem);
                            continue;
                        }
                        let insert = false;
                        for (let j = 0; j < results.length; j ++) {
                            if (results[j].sum_point < ritem.sum_point) {
                                results.splice(j, 0, ritem);
                                insert = true;
                                break;
                            }
                        }
                        if (!insert) {
                            results.push(ritem);
                        }
                    }

                    res.render('Rank/' + tab, {results, period});
                }
            } else if (tab === 'mine') {
                let period = req.query.period || 0;

                let searchQuery = {};
                let startSessionNo = 0;

                if (period * 1 > 0) {
                    let subdays = [0, 7, 30];
                    let end = moment().format('YYYY-MM-DD') + ' 23:59:59';
                    let start = moment().subtract(subdays[period - 1],'d').format('YYYY-MM-DD') + ' 00:00:00';
                    let sessions = await SessionModel.find({session_start: {$gte: start, $lte: end}}).sort({session_no: 1}).lean().exec();
                    let sessionNos = sessions.map(item => item.session_no);
                    searchQuery = {session_no: {$in: sessionNos}};
                    startSessionNo = sessionNos[0];
                }

                searchQuery = {...searchQuery, telegramId: res.locals.user.telegramId};

                let myTelegramId = res.locals.user.telegramId;
                let results = await ResultModel.find(searchQuery).sort({session_no: -1}).populate('session').lean().exec();
                for (let i = results.length - 1; i >= 0; i --) {
                    let aResults = await ResultModel.aggregate([
                        {
                            $match: { session_no: {$lte: results[i].session_no, $gte: startSessionNo} }
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
                    results[i].total_rank = points.indexOf(myPoint) + 1;
                }

                res.render('Rank/' + tab, {results, period});
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
