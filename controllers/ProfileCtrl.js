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
            let user = await StudentModel.find({_id: res.locals.user._id}).lean().exec();
            let motto = user[0].motto;
            res.render('Profile/index', {...profileData, motto});
        },

        updateMotto: async function(req, res) {
            await StudentModel.update({
                _id: res.locals.user._id
            }, {
                $set: {motto: req.body.motto}
            });
            res.redirect('/');
        }
    };

};
