const express = require('express');
const moment = require('moment');
const {validationResult}  = require('express-validator/check');
const TournamentModel = require('../models/tournament');
const LanguageModel = require('../models/language');
const SessionModel = require('../models/fortunaSession');
const TournamentHistoryModel = require('../models/tournamentHistory');
const TypeModel = require('../models/type');
const LevelModel = require('../models/level');
const FortunaHistoryModel = require('../models/fortunaHistory');
const StudentModel = require('../models/student');

module.exports = function(){

    return {
        index: async function(req, res) {
            let tournaments = await TournamentModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Tournament'};
            res.render('Tournament/index', {tournaments});
        },

        studentIndex: async function(req, res) {
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
            let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
            let telegramId = res.locals.user.telegramId;
            let tournamentHistories = await TournamentHistoryModel.find({telegramId: telegramId, isEnd: 1}).lean().exec();
            let tournamentIds = tournamentHistories.map(item => item.tournament);
            if (tournamentIds.length > 0) {
                searchQuery = {...searchQuery, _id: {$nin: tournamentIds}};
            }

            let tournaments = await TournamentModel.find(searchQuery).lean().exec();
            res.locals = {...res.locals, title: 'Tournament'};

            if (tournaments.length > 0) {
                let tournament = tournaments[0];
                tournamentHistories = await TournamentHistoryModel.find({telegramId: telegramId, tournament: tournament._id});
                let isSlot = false;
                if (tournamentHistories.length > 0) isSlot = true;
                res.render('Tournament/student-index', {tournament, isSlot});
            } else {
                res.render('Tournament/not-exist');
            }
        },

        doEnroll: async function(req, res) {
            let telegramId = res.locals.user.telegramId;
            let tournamentId = req.body.tournament_id;
            let tournament = await TournamentModel.findOne({_id: tournamentId});

            let oldHistories = await TournamentHistoryModel.find({
                telegramId: telegramId,
                tournament: tournamentId
            });

            let counts = await TournamentHistoryModel.aggregate([
                {
                    $match: {tournament: tournamentId}
                },
                {
                    $group: {
                        _id: '$tournament',
                        count: {$sum: 1}
                    }
                }
            ]);

            if (counts[0].count >= tournament.qualifier) {
                return res.json({result: 'fail', msg: 'Tournament is full'});
            }

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
            if (totalFortuna < tournament.price) {
                return res.json({result: 'false', msg: 'Insufficient FRT!'});
            }

            if (oldHistories.length > 0) {
                return res.json({result: 'success'});
            }

            let fHistory = new FortunaHistoryModel({
                telegramId: telegramId,
                fortuna_point: tournament.price * -1,
                tournament: tournamentId,
                state: 8,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            await fHistory.save();

            let user = await StudentModel.findOne({telegramId: telegramId});

            let tHistory = new TournamentHistoryModel({
                telegramId: telegramId,
                username: user.username,
                tournament: tournamentId,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
                level: 1
            });

            await tHistory.save();

            return res.json({result: 'success'});
        },

        create: async function(req, res) {
            let languages = await LanguageModel.find({}).lean().exec();
            let sessions = await SessionModel.find({session: {$ne: null, $ne: ''}}).sort({session: 1}).lean().exec();
            let types = await TypeModel.find({}).lean().exec();
            let levels = await LevelModel.find({}).lean().exec();
            let today = moment().format('YYYY-MM-DD');
            res.locals = {...res.locals, title: 'Add Tournament'};
            res.render('Tournament/create', {languages, sessions, types, levels, today});
        },

        edit: async function(req, res) {
            let languages = await LanguageModel.find({}).lean().exec();
            let sessions = await SessionModel.find({session: {$ne: null, $ne: ''}}).sort({session: 1}).lean().exec();
            let types = await TypeModel.find({}).lean().exec();
            let levels = await LevelModel.find({}).lean().exec();
            let today = moment().format('YYYY-MM-DD');
            let tournament = await TournamentModel.findOne({_id: req.query.id});
            res.locals = {...res.locals, title: 'Edit Tournament'};
            res.render('Tournament/edit', {languages, sessions, types, levels, today, tournament});
        },

        doCreate: async function(req, res) {
            let start = moment(req.body.start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let end = moment(req.body.end).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let firstStart = moment(req.body.first_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let secondStart = moment(req.body.second_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let thirdStart = moment(req.body.third_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let fourthStart = moment(req.body.fourth_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');

            let data = {
                name: req.body.name,
                banner: req.files.banner[0].filename,
                award_1: req.files.awards_1[0].filename,
                award_2: req.files.awards_1[0].filename,
                award_3: req.files.awards_3[0].filename,
                price: req.body.price,
                start_at: start,
                end_at: end,
                gains_1: req.body.gains_1,
                gains_2: req.body.gains_2,
                gains_3: req.body.gains_3,
                qualifier: {
                    start: firstStart,
                    open: req.body.first_open,
                    qualified: req.body.first_qualified,
                    language: req.body.first_language,
                    exec_type: req.body.first_type,
                    level: req.body.first_level,
                    session: req.body.first_session
                },
                quarterfinal: {
                    start: secondStart,
                    language: req.body.second_language,
                    exec_type: req.body.second_type,
                    level: req.body.second_level,
                    session: req.body.second_session,
                    qualified: req.body.second_qualified
                },
                semifinal: {
                    start: thirdStart,
                    language: req.body.third_language,
                    exec_type: req.body.third_type,
                    level: req.body.third_level,
                    session: req.body.third_session,
                    qualified: req.body.third_qualified
                },
                final: {
                    start: fourthStart,
                    language: req.body.fourth_language,
                    exec_type: req.body.fourth_type,
                    level: req.body.fourth_level,
                    session: req.body.fourth_session
                },
                status: 1
            };
            let tournament = new TournamentModel(data);
            await tournament.save();
            res.redirect('/admin/tournament');
        },

        doUpdate: async function(req, res) {
            let start = moment(req.body.start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let end = moment(req.body.end).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let firstStart = moment(req.body.first_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let secondStart = moment(req.body.second_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let thirdStart = moment(req.body.third_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let fourthStart = moment(req.body.fourth_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let data = {
                name: req.body.name,
                price: req.body.price,
                start_at: start,
                end_at: end,
                gains_1: req.body.gains_1,
                gains_2: req.body.gains_2,
                gains_3: req.body.gains_3,
                qualifier: {
                    start: firstStart,
                    open: req.body.first_open,
                    qualified: req.body.first_qualified,
                    language: req.body.first_language,
                    exec_type: req.body.first_type,
                    level: req.body.first_level,
                    session: req.body.first_session
                },
                quarterfinal: {
                    start: secondStart,
                    language: req.body.second_language,
                    exec_type: req.body.second_type,
                    level: req.body.second_level,
                    session: req.body.second_session,
                    qualified: req.body.second_qualified
                },
                semifinal: {
                    start: thirdStart,
                    language: req.body.third_language,
                    exec_type: req.body.third_type,
                    level: req.body.third_level,
                    session: req.body.third_session,
                    qualified: req.body.third_qualified
                },
                final: {
                    start: fourthStart,
                    language: req.body.fourth_language,
                    exec_type: req.body.fourth_type,
                    level: req.body.fourth_level,
                    session: req.body.fourth_session
                },
                status: 1
            };

            if (req.files && req.files.banner && req.files.banner.length > 0 ) {
                data.banner = req.files.banner[0].filename;
            }
            if (req.files && req.files.awards_1 && req.files.awards_1.length > 0 ) {
                data.award_1 = req.files.awards_1[0].filename;
            }
            if (req.files && req.files.awards_2 && req.files.awards_2.length > 0 ) {
                data.award_2 = req.files.awards_2[0].filename;
            }
            if (req.files && req.files.awards_3 && req.files.awards_3.length > 0 ) {
                data.award_3 = req.files.awards_3[0].filename;
            }

            await TournamentModel.update({_id: req.query.id}, {$set: data});
            res.redirect('/admin/tournament');
        }

    };

};
