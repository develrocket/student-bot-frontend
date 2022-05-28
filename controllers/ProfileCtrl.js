const express = require('express');
const moment = require('moment');

const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const axios = require('axios').default;
const Utils = require('../helpers/utils');

module.exports = function(){

    return {
        index: async function(req, res) {
            let profileData = await Utils.getProfileData(res.locals.user.telegramId);
            res.locals = {...res.locals, title: 'Profile', moment };
            res.render('Profile/index', profileData);
        },
    };

};
