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
            res.locals = {...res.locals, title: 'Profile', moment };
            res.render('Profile/index', {joinDate, result, sessionCount});
        },
    };

};
