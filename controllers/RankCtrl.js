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

            if (tab === 'top') {
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

                res.render('Rank/' + tab, {results});
            } else if (tab === 'mine') {
                let filterBy = req.query.filterBy || 0;

                let searchQuery = {};

                if (filterBy * 1 === 1) {
                    let today = moment().format('YYYY-MM-DD');
                    let sessions = await SessionModel.find({session_start: {$regex: today}}).lean().exec();
                    let sessionNos = sessions.map(item => item.session_no);
                    searchQuery = {session_no: {$in: sessionNos}};
                } else if (filterBy * 1 >= 2) {
                    let end = moment().format('YYYY-MM-DD') + ' 23:59:59';
                    let subday = filterBy * 1 === 2 ? 7 : 30;
                    let start = moment().subtract(subday,'d').format('YYYY-MM-DD') + ' 00:00:00';
                    let sessions = await SessionModel.find({session_start: {$gte: start, $lte: end}}).lean().exec();
                    let sessionNos = sessions.map(item => item.session_no);
                    searchQuery = {session_no: {$in: sessionNos}};
                }

                searchQuery = {...searchQuery, telegramId: res.locals.user.telegramId};

                let myTelegramId = res.locals.user.telegramId;
                let results = await ResultModel.find(searchQuery).sort({session_no: -1}).populate('session').lean().exec();
                for (let i = results.length - 1; i >= 0; i --) {
                    let aResults = await ResultModel.aggregate([
                        {
                            $match: { session_no: {$lte: results[i].session_no} }
                        },
                        {
                            $group: { _id: "$telegramId", totalPoints: { $sum: "$session_points" } }
                        }
                    ]);

                    let points = [];
                    let myPoint = 0;
                    for (let j = 0; j < aResults.length; j ++) {
                        if (points.indexOf(aResults[j].totalPoints) < 0) points.push(aResults[j].totalPoints.toFixed(2));
                        if (aResults[j]._id + '' === myTelegramId + '') myPoint = aResults[j].totalPoints.toFixed(2);
                    }
                    results[i].total_rank = points.indexOf(myPoint) + 1;
                }

                res.render('Rank/' + tab, {results});
            } else {
                let period = req.query.period || 0;
                let periods = [7, 30, 90];

                let searchQuery = {};

                if (period > 0) {
                    let end = moment().format('YYYY-MM-DD') + ' 23:59:59';
                    let subday = periods[period * 1 - 1];
                    let start = moment().subtract(subday,'d').format('YYYY-MM-DD') + ' 00:00:00';
                    let sessions = await SessionModel.find({session_start: {$gte: start, $lte: end}}).lean().exec();
                    let sessionNos = sessions.map(item => item.session_no);
                    searchQuery = {session_no: {$in: sessionNos}};
                }

                searchQuery = {...searchQuery, telegramId: res.locals.user.telegramId};

                let myTelegramId = res.locals.user.telegramId;
                let results = await ResultModel.find(searchQuery).sort({session_no: 1}).populate('session').lean().exec();
                for (let i = 0; i < results.length; i ++) {
                    let aResults = await ResultModel.aggregate([
                        {
                            $match: { session_no: {$lte: results[i].session_no} }
                        },
                        {
                            $group: { _id: "$telegramId", totalPoints: { $sum: "$session_points" } }
                        }
                    ]);

                    let points = [];
                    let myPoint = 0;
                    for (let j = 0; j < aResults.length; j ++) {
                        if (points.indexOf(aResults[j].totalPoints) < 0) points.push(aResults[j].totalPoints.toFixed(2));
                        if (aResults[j]._id + '' === myTelegramId + '') myPoint = aResults[j].totalPoints.toFixed(2);
                    }
                    results[i].total_rank = points.indexOf(myPoint) + 1;
                }

                res.render('Rank/' + tab, {results, period});
            }
        }
        ,
    };

};
