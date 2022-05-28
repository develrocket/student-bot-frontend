const express = require('express');
const moment = require('moment');

const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const StudentModel = require('../models/student');
const axios = require('axios').default;
const Utils = require('../helpers/utils');

module.exports = function(){

    return {
        index: async function(req, res) {
            let profileData = await Utils.getProfileData(res.locals.user.telegramId);
            res.locals = {...res.locals, title: 'Profile', moment };
            res.render('Profile/index', profileData);
        },

        updateMotto: async function(req, res) {
            await StudentModel.update({
                telegramId: res.locals.user.telegramId
            }, {
                $set: {motto: req.body.value}
            });
            res.redirect('/');
        }
    };

};
