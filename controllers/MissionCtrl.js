const express = require('express');
const moment = require('moment');
const {validationResult}  = require('express-validator/check');
const MissionModel = require('../models/mission');
const GreatPersonModel = require('../models/greatPerson');
const SkillModel = require('../models/skill');


module.exports = function(){

    return {
        index: async function(req, res) {
            let missions = await MissionModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Mission Status'};
            res.render('mission/index', {missions});
        },

        create: async function(req, res) {
            let persons = await GreatPersonModel.find({status: 2}).lean().exec();
            let skills = await SkillModel.find({}).lean().exec();
            let today = moment().format('YYYY-MM-DD');
            res.locals = {...res.locals, title: 'Add New Mission'};
            res.render('Mission/create', {persons, skills, today});
        },


    };

};
