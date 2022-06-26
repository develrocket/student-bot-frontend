const express = require('express');
const moment = require('moment');
const {validationResult}  = require('express-validator/check');
const MissionModel = require('../models/mission');
const GreatPersonModel = require('../models/greatPerson');
const SkillModel = require('../models/skill');
const SkillHistoryModel = require('../models/skillHistory');
const StudentResultModel = require('../models/studentResult');
const FortunaHistoryModel = require('../models/fortunaHistory');
const RentHistoryModel = require('../models/rentHistory');
const MissionHistoryModel = require('../models/missionHistory');
const StudentPointHistoryModel = require('../models/studentPointHistory');
const Utils = require('../helpers/utils');
const StudentModel = require('../models/student');

module.exports = function(){

    return {
        index: async function(req, res) {
            let missions = await MissionModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Mission Status'};
            res.render('Mission/index', {missions});
        },

        studentIndex: async function(req, res) {
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
            let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
            let telegramId = res.locals.user.telegramId;
            let missionHistories = await MissionHistoryModel.find({telegramId: telegramId}).lean().exec();
            let missionIds = missionHistories.map(item => item.mission);
            if (missionIds.length > 0) {
                searchQuery = {...searchQuery, _id: {$nin: missionIds}};
            }

            let missions = await MissionModel.find(searchQuery).populate('person').lean().exec();
            let missionCount = await MissionModel.count(searchQuery);

            let skills = await SkillModel.find({}).lean().exec();
            let persons = await GreatPersonModel.find({status: 2}).lean().exec();

            let showMore = false;
            if (missionCount > 10) showMore = true;

            res.locals = {...res.locals, title: 'Mission Status'};
            res.render('Mission/student-index', {missions, skills, persons, showMore, missionCount, 'message': req.flash('message'), 'error': req.flash('error')});
        },

        search: async function(req, res) {
            let skill = req.body.skill;
            let person = req.body.person;
            let index = req.body.page;
            let key = req.body.key;

            let searchQuery = {};
            if (skill) {
                searchQuery = {...searchQuery, skills: {skill}};
            }
            if (key) {
                searchQuery = {...searchQuery, $or: [{name: {$regex: key}}, {description: {$regex: key}}]};
            }
            if (person) {
                searchQuery = {...searchQuery, person: person};
            }

            let missions = await MissionModel.find(searchQuery).limit(15).skip(index * 15).lean().exec();
            let missionCount = await MissionModel.count(searchQuery);
            let skills = await SkillModel.find({}).lean().exec();
            let persons = await GreatPersonModel.find({status: 2}).lean().exec();
            let showMore = false;
            if (missionCount > 10) showMore = true;

            res.render('Mission/_mission_parts', {missions, skills, missionCount, layout: false, showMore, persons});
        },

        loadMore: async function(req, res) {
            let skill = req.body.skill;
            let person = req.body.person;
            let index = req.body.page;
            let key = req.body.key;

            let searchQuery = {};
            if (skill) {
                searchQuery = {...searchQuery, skills: {skill}};
            }
            if (key) {
                searchQuery = {...searchQuery, $or: [{name: {$regex: key}}, {description: {$regex: key}}]};
            }
            if (person) {
                searchQuery = {...searchQuery, person: person};
            }

            let missions = await MissionModel.find(searchQuery).limit(15).skip(index * 15).lean().exec();

            res.render('Mission/_mission_item', {missions, layout: false});
        },

        create: async function(req, res) {
            let persons = await GreatPersonModel.find({status: 2}).lean().exec();
            let skills = await SkillModel.find({}).sort({name: 1}).lean().exec();
            let today = moment().format('YYYY-MM-DD');
            res.locals = {...res.locals, title: 'Add New Mission'};
            res.render('Mission/create', {persons, skills, today});
        },

        edit: async function(req, res) {
            let persons = await GreatPersonModel.find({status: 2}).lean().exec();
            let skills = await SkillModel.find({}).lean().exec();
            let id = req.query.id;
            let mission = await MissionModel.findOne({_id: id}).populate('person');
            let today = moment().format('YYYY-MM-DD');
            res.locals = {...res.locals, title: 'Reschedule Mission'};
            res.render('Mission/edit', {persons, skills, mission, today});
        },

        check: async function(req, res) {
            let id = req.query.id;
            let mission = await MissionModel.findOne({_id: id}).populate('person');

            let telegramId = res.locals.user.telegramId;

            let fResults = await FortunaHistoryModel.aggregate([
                {
                    $match: { telegramId: telegramId + '' }
                },
                {
                    $group:
                        {
                            _id: "$telegramId",
                            totalPoints: { $sum: "$fortuna_point" }
                        }
                }
            ]);
            let totalFortuna = fResults.length > 0 ? fResults[0].totalPoints : 0;

            let skills = await SkillModel.find({}).lean().exec();

            let skillHistories = await SkillHistoryModel.aggregate([
                {
                    $match: { telegramId: telegramId + '' }
                },
                {
                    $group:
                        {
                            _id: "$skill",
                            totalPoints: { $sum: "$score" }
                        }
                }
            ]);
            let mySkills = {};
            for (let i = 0; i < skills.length; i ++) {
                mySkills[skills[i].name] = 0;
                for (let j = 0; j < skillHistories.length; j ++) {
                    if (skillHistories[j]._id == skills[i].name) {
                        mySkills[skills[i].name] = (skillHistories[j].totalPoints * 1).toFixed(1)
                    }
                }
            }

            let isSkillChecked = true;
            for (let i = 0; i < mission.skills.length; i ++) {
                if (mySkills[mission.skills[i].skill] < mission.skills[i].amount) {
                    isSkillChecked = false;
                }
            }

            let rentHistories = await RentHistoryModel.find({telegramId: telegramId, isUsed: 0, person: mission.person});
            let isRentChecked = false;
            if (rentHistories.length > 0) {
                isRentChecked = true;
            } else {
                isRentChecked = false;
            }

            res.locals = {...res.locals, title: 'Reschedule Mission'};
            res.render('Mission/check', {mission, totalFortuna, mySkills, isSkillChecked, isRentChecked});
        },

        rentGreat: async function(req, res) {
            let missionId = req.body.missionId;
            let telegramId = res.locals.user.telegramId;
            let mission = await MissionModel.findOne({_id: missionId}).populate('person');
            let rentHistory = await RentHistoryModel.find({
                isUsed: 0,
                person: mission.person._id,
                telegramId: telegramId
            });

            if (rentHistory.length === 0) {
                let history = new RentHistoryModel({
                    isUsed: 0,
                    person: mission.person._id,
                    telegramId: telegramId,
                    amount: mission.person.price
                });
                await history.save();

                let fHistory = new FortunaHistoryModel({
                    telegramId: telegramId,
                    fortuna_point: mission.person.price * -1,
                    // mission: mission._id,
                    person: mission.person._id,
                    state: 4,
                    created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                });
                await fHistory.save();
            }

            res.json({result: 'success'});
        },

        doCreate: async function(req, res) {
            let start = moment(req.body.start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let end = moment(req.body.end).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let data = {
                name: req.body.name,
                banner: req.files.banner[0].filename,
                badge: req.files.badge[0].filename,
                description: req.body.description,
                person: req.body.person,
                price: req.body.price,
                start_at: start,
                end_at: end,
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
            let start = moment(req.body.start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let end = moment(req.body.end).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');

            let id = req.query.id;
            let data = {
                name: req.body.name,
                description: req.body.description,
                person: req.body.person,
                price: req.body.price,
                start_at: start,
                end_at: end,
                status: 1,
                isNoti: 0
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
        },

        complete: async function(req, res) {
            let missionId = req.query.id;
            let telegramId = res.locals.user.telegramId;
            let history = new MissionHistoryModel({
                telegramId: telegramId,
                mission: missionId,
                username: res.locals.user.username,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            await history.save();

            let mission = await MissionModel.findOne({_id: missionId});

            await RentHistoryModel.update({
                telegramId: telegramId,
                person: mission.person,
                isUsed: 0
            }, {
                $set: {isUsed: 1}
            });

            let skill = mission.skills[0].skill;

            let ns = new SkillHistoryModel({
                telegramId: telegramId,
                skill: skill,
                score: 20,
                mission: mission._id
            });
            await ns.save();

            let sp = new StudentPointHistoryModel({
                telegramId: telegramId,
                point: 200,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            await sp.save();

            let totalPoint = await StudentPointHistoryModel.aggregate([
                {
                    $match: { telegramId: telegramId }
                },
                {
                    $group:
                        {
                            _id: "$telegramId",
                            totalPoints: { $sum: "$point" },
                        }
                }
            ]);

            totalPoint = totalPoint.length > 0 ? totalPoint[0].totalPoints : 0;
            const title = await Utils.getTitle(totalPoint);

            await StudentModel.update({
                telegramId: telegramId
            }, {
                $set: {
                    title: title,
                    point: totalPoint
                }
            })

            let fHistory = new FortunaHistoryModel({
                telegramId: telegramId,
                fortuna_point: mission.price * -1,
                mission: mission._id,
                state: 7,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            await fHistory.save();

            req.flash('message', "You completed mission successfully!");
            return res.redirect('/tasks');
        }

    };

};
