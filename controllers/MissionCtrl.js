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

        edit: async function(req, res) {
            let persons = await GreatPersonModel.find({status: 2}).lean().exec();
            let skills = await SkillModel.find({}).lean().exec();
            let id = req.query.id;
            let mission = await MissionModel.findOne({_id: id});
            let today = moment().format('YYYY-MM-DD');
            res.locals = {...res.locals, title: 'Reschedule Mission'};
            res.render('Mission/edit', {persons, skills, mission, today});
        },

        doCreate: async function(req, res) {
            let data = {
                name: req.body.name,
                banner: req.files.banner[0].filename,
                badge: req.files.badge[0].filename,
                description: req.body.name,
                person: req.body.person,
                price: req.body.price,
                start_at: req.body.start,
                end_at: req.body.end,
                status: 1
            };
            let skills = req.body.skill;
            let amounts = req.body.amount;
            let mSkills = [];
            for (let i = 0; i < skills.length; i ++ ) {
                mSkills.push({skill: skills[i], amount: amounts[i]});
            }
            data.skills = mSkills;
            let mission = new MissionModel(data);
            await mission.save();

            res.redirect('/mission');
        },

        doUpdate: async function(req, res) {
            let id = req.query.id;
            let data = {
                name: req.body.name,
                description: req.body.name,
                person: req.body.person,
                price: req.body.price,
                start_at: req.body.start,
                end_at: req.body.end,
                status: 1
            };
            if (req.files && req.files.banner && req.files.banner.length > 0 ) {
                data.banner = req.files.banner[0].filename;
            }
            if (req.files && req.files.badge && req.files.badge.length > 0 ) {
                data.badge = req.files.badge[0].filename;
            }
            let skills = req.body.skill;
            let amounts = req.body.amount;
            let mSkills = [];
            for (let i = 0; i < skills.length; i ++ ) {
                mSkills.push({skill: skills[i], amount: amounts[i]});
            }
            data.skills = mSkills;
            await MissionModel.update({_id: id}, {$set: data})

            res.redirect('/mission');
        }

    };

};
