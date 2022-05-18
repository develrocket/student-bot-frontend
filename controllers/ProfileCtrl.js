const express = require('express');
const moment = require('moment');

const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const axios = require('axios').default;

module.exports = function(){

    return {
        index: async function(req, res) {
            let result = await ResultModel.find({telegramId: res.locals.user.telegramId}).populate('session').sort({session_no: -1}).lean().exec();
            let joinDate = result.length > 0 ? result[result.length - 1].session_start : '';
            let sessionCount = await SessionModel.countDocuments({});

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
                let rlt = await ResultModel.find({telegramId: item._id}).sort({session_no: -1}).lean().exec();
                rlt = rlt[0];
                let ritem = {
                    username: rlt.username,
                    telegramId: rlt.telegramId,
                    sum_point: rlt.sum_point,
                    title: rlt.title,
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

            let myTelegramId = res.locals.user.telegramId;
            let rank = 0;
            for (let i = 0; i < results.length; i++) {
                if (myTelegramId + '' === results[i].telegramId + '') rank = i + 1;
            }

            res.locals = {...res.locals, title: 'Profile', moment };
            res.render('Profile/index', {joinDate, result, sessionCount, rank});
        },
    };

};
