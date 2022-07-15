const express = require('express');
const moment = require('moment');
const {validationResult} = require('express-validator/check');
const TournamentModel = require('../models/tournament');
const LanguageModel = require('../models/language');
const SessionModel = require('../models/fortunaSession');
const TournamentHistoryModel = require('../models/tournamentHistory');
const TypeModel = require('../models/type');
const LevelModel = require('../models/level');
const FortunaHistoryModel = require('../models/fortunaHistory');
const StudentModel = require('../models/student');
const QuestionModel = require('../models/question');
const TournamentTestModel = require('../models/tournamentTest');
const FortunaSessionModel = require('../models/fortunaSession');

async function getQualifyData(tournament, currentTime, telegramId) {
    let qualifyTimeDiff = moment.utc(moment(currentTime, "YYYY-MM-DD HH:mm:ss").diff(moment(tournament.qualifier.start + ':00', "YYYY-MM-DD HH:mm:ss"))).format("x");
    let qualifySession = await FortunaSessionModel.findOne({session_id: tournament.qualifier.session});
    let qualifierSlots = await TournamentHistoryModel.find({tournament: tournament, level: 1}).sort({finished_at: 1});
    let qualifyExists = false;

    qualifierSlots.sort((a, b) => b.score - a.score);

    for (let i = 0; i < qualifierSlots.length; i++) {
        if (qualifierSlots[i].telegramId + '' === telegramId + '') {
            qualifyExists = true;
        }
    }

    for (let i = qualifierSlots.length; i < tournament.qualifier.open; i ++) {
        qualifierSlots.push({});
    }

    return {qualifyTimeDiff, qualifySession, qualifierSlots, qualifyExists};
}

async function getQuarterData(tournament, currentTime, telegramId) {
    let quarterTimeDiff = moment.utc(moment(currentTime, "YYYY-MM-DD HH:mm:ss").diff(moment(tournament.quarterfinal.start + ':00', "YYYY-MM-DD HH:mm:ss"))).format("x");
    let quarterSession = await FortunaSessionModel.findOne({session_id: tournament.quarterfinal.session});
    let quarterSlots = await TournamentHistoryModel.find({tournament: tournament, level: 2}).sort({finished_at: 1});
    let quarterExists = false;

    quarterSlots.sort((a, b) => b.score - a.score);

    for (let i = 0; i < quarterSlots.length; i++) {
        if (quarterSlots[i].telegramId + '' === telegramId + '') {
            quarterExists = true;
        }
    }

    for (let i = quarterSlots.length; i < tournament.qualifier.qualified; i ++) {
        quarterSlots.push({});
    }

    return {quarterTimeDiff, quarterSession, quarterSlots, quarterExists};
}

async function getSemiData(tournament, currentTime, telegramId) {
    let semiTimeDiff = moment.utc(moment(currentTime, "YYYY-MM-DD HH:mm:ss").diff(moment(tournament.semifinal.start + ':00', "YYYY-MM-DD HH:mm:ss"))).format("x");
    let semiSession = await FortunaSessionModel.findOne({session_id: tournament.semifinal.session});
    let semiSlots = await TournamentHistoryModel.find({tournament: tournament, level: 3}).sort({finished_at: 1});
    let semiExists = false;

    semiSlots.sort((a, b) => b.score - a.score);

    for (let i = 0; i < semiSlots.length; i++) {
        if (semiSlots[i].telegramId + '' === telegramId + '') {
            semiExists = true;
        }
    }


    for (let i = semiSlots.length; i < tournament.quarterfinal.qualified; i ++) {
        semiSlots.push({});
    }

    return {semiTimeDiff, semiSession, semiSlots, semiExists};
}

async function getFinalData(tournament, currentTime, telegramId) {
    let finalTimeDiff = moment.utc(moment(currentTime, "YYYY-MM-DD HH:mm:ss").diff(moment(tournament.final.start + ':00', "YYYY-MM-DD HH:mm:ss"))).format("x");
    let finalSession = await FortunaSessionModel.findOne({session_id: tournament.final.session});
    let finalSlots = await TournamentHistoryModel.find({tournament: tournament, level: 4}).sort({finished_at: 1});
    let finalExists = false;

    finalSlots.sort((a, b) => b.score - a.score);

    for (let i = 0; i < finalSlots.length; i++) {
        if (finalSlots[i].telegramId + '' === telegramId + '') {
            finalExists = true;
        }
    }

    for (let i = finalSlots.length; i < tournament.semifinal.qualified; i ++) {
        finalSlots.push({});
    }

    return {finalTimeDiff, finalSession, finalSlots, finalExists};
}

module.exports = function () {

    return {
        index: async function (req, res) {
            let tournaments = await TournamentModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Tournament'};
            res.render('Tournament/index', {tournaments});
        },

        studentIndex: async function (req, res) {
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
            let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
            let telegramId = res.locals.user.telegramId;
            let tournamentHistories = await TournamentHistoryModel.find({
                telegramId: telegramId,
                isEnd: 1
            }).lean().exec();
            let tournamentIds = tournamentHistories.map(item => item.tournament);
            if (tournamentIds.length > 0) {
                searchQuery = {...searchQuery, _id: {$nin: tournamentIds}};
            }

            let tournaments = await TournamentModel.find(searchQuery).lean().exec();
            res.locals = {...res.locals, title: 'Tournament'};

            if (tournaments.length > 0) {
                let tournament = tournaments[0];
                tournamentHistories = await TournamentHistoryModel.find({
                    telegramId: telegramId,
                    tournament: tournament._id
                });
                let isSlot = false;
                if (tournamentHistories.length > 0) isSlot = true;
                res.render('Tournament/student-index', {tournament, isSlot});
            } else {
                res.render('Tournament/not-exist');
            }
        },

        doEnroll: async function (req, res) {
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

            if (counts.length > 0 && counts[0].count >= tournament.qualifier) {
                return res.json({result: 'fail', msg: 'Tournament is full'});
            }

            let fResults = await FortunaHistoryModel.aggregate([
                {
                    $match: {telegramId: telegramId + ''}
                },
                {
                    $group:
                        {
                            _id: "$telegramId",
                            totalPoints: {$sum: "$fortuna_point"}
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
                finished_at: '9999-99-99 99:99:99',
                level: 1,
                score: 0
            });

            await tHistory.save();

            return res.json({result: 'success'});
        },

        create: async function (req, res) {
            let languages = await LanguageModel.find({}).lean().exec();
            let sessions = await SessionModel.find({session: {$ne: null, $ne: ''}}).sort({session: 1}).lean().exec();
            let types = await TypeModel.find({}).lean().exec();
            let levels = await LevelModel.find({}).lean().exec();
            let today = moment().format('YYYY-MM-DD');
            res.locals = {...res.locals, title: 'Add Tournament'};
            res.render('Tournament/create', {languages, sessions, types, levels, today});
        },

        edit: async function (req, res) {
            let languages = await LanguageModel.find({}).lean().exec();
            let sessions = await SessionModel.find({session: {$ne: null, $ne: ''}}).sort({session: 1}).lean().exec();
            let types = await TypeModel.find({}).lean().exec();
            let levels = await LevelModel.find({}).lean().exec();
            let today = moment().format('YYYY-MM-DD');
            let tournament = await TournamentModel.findOne({_id: req.query.id});
            res.locals = {...res.locals, title: 'Edit Tournament'};
            res.render('Tournament/edit', {languages, sessions, types, levels, today, tournament});
        },

        doCreate: async function (req, res) {
            let start = moment(req.body.start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            // let end = moment(req.body.end).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let firstStart = moment(req.body.first_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let secondStart = moment(req.body.second_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let thirdStart = moment(req.body.third_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let fourthStart = moment(req.body.fourth_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let session = await FortunaSessionModel.findOne({session_id: req.body.fourth_session});
            let end = moment(req.body.fourth_start).add(req.body.timezoneOffset + 90, 'm').add(session.questions * req.body.answer_time, 's').format('YYYY-MM-DD HH:mm');

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
                    session: req.body.first_session,
                    status: 0
                },
                quarterfinal: {
                    start: secondStart,
                    language: req.body.second_language,
                    exec_type: req.body.second_type,
                    level: req.body.second_level,
                    session: req.body.second_session,
                    qualified: req.body.second_qualified,
                    status: 0
                },
                semifinal: {
                    start: thirdStart,
                    language: req.body.third_language,
                    exec_type: req.body.third_type,
                    level: req.body.third_level,
                    session: req.body.third_session,
                    qualified: req.body.third_qualified,
                    status: 0
                },
                final: {
                    start: fourthStart,
                    language: req.body.fourth_language,
                    exec_type: req.body.fourth_type,
                    level: req.body.fourth_level,
                    session: req.body.fourth_session,
                    answer_time: req.body.answer_time,
                    status: 0
                },
                status: 1
            };

            let tournament = new TournamentModel(data);
            await tournament.save();
            res.redirect('/admin/tournament');
        },

        doUpdate: async function (req, res) {
            let start = moment(req.body.start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            // let end = moment(req.body.end).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let firstStart = moment(req.body.first_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let secondStart = moment(req.body.second_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let thirdStart = moment(req.body.third_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let fourthStart = moment(req.body.fourth_start).add(req.body.timezoneOffset, 'm').format('YYYY-MM-DD HH:mm');
            let end = moment(req.body.fourth_start).add(req.body.timezoneOffset + 90, 'm').add(session.questions * req.body.answer_time, 's').format('YYYY-MM-DD HH:mm');

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
                    session: req.body.first_session,
                    status: 0
                },
                quarterfinal: {
                    start: secondStart,
                    language: req.body.second_language,
                    exec_type: req.body.second_type,
                    level: req.body.second_level,
                    session: req.body.second_session,
                    qualified: req.body.second_qualified,
                    status: 0
                },
                semifinal: {
                    start: thirdStart,
                    language: req.body.third_language,
                    exec_type: req.body.third_type,
                    level: req.body.third_level,
                    session: req.body.third_session,
                    qualified: req.body.third_qualified,
                    status: 0
                },
                final: {
                    start: fourthStart,
                    language: req.body.fourth_language,
                    exec_type: req.body.fourth_type,
                    level: req.body.fourth_level,
                    session: req.body.fourth_session,
                    answer_time: req.body.answer_time,
                    status: 0
                },
                status: 1
            };

            if (req.files && req.files.banner && req.files.banner.length > 0) {
                data.banner = req.files.banner[0].filename;
            }
            if (req.files && req.files.awards_1 && req.files.awards_1.length > 0) {
                data.award_1 = req.files.awards_1[0].filename;
            }
            if (req.files && req.files.awards_2 && req.files.awards_2.length > 0) {
                data.award_2 = req.files.awards_2[0].filename;
            }
            if (req.files && req.files.awards_3 && req.files.awards_3.length > 0) {
                data.award_3 = req.files.awards_3[0].filename;
            }

            await TournamentModel.update({_id: req.query.id}, {$set: data});
            res.redirect('/admin/tournament');
        },

        slot: async function (req, res) {
            let telegramId = res.locals.user.telegramId;
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
            let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
            let tournaments = await TournamentModel.find(searchQuery).lean().exec();

            if (tournaments.length === 0) {
                res.redirect('/tournament');
            }

            let tournament = tournaments[0];
            currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');

            let qualiferData = await getQualifyData(tournament, currentTime, telegramId);
            let quarterData = await getQuarterData(tournament, currentTime, telegramId);
            let semiData = await getSemiData(tournament, currentTime, telegramId);
            let finalData = await getFinalData(tournament, currentTime, telegramId);


            res.locals = {...res.locals, title: 'Tournament'};
            res.render('Tournament/slot', {tournament, ...qualiferData, ...quarterData, ...semiData, ...finalData});
        },

        test: async function(req, res) {
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
            let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
            let tournaments = await TournamentModel.find(searchQuery);
            let telegramId = res.locals.user.telegramId;

            if (tournaments.length === 0) {
                res.redirect('/tournament');
            }

            let type = req.query.type;
            let types = ['qualifier', 'quarterfinal', 'semifinal', 'final'];
            if (types.indexOf(type) < 0 || !type) {
                res.redirect('/tournament');
            }

            let tournament = tournaments[0];

            let slots = await TournamentHistoryModel.find({tournament: tournament._id});

            let exist = false;
            for (let i = 0; i < slots.length; i++) {
                if (slots[i].telegramId + '' === telegramId + '') {
                    exist = true;
                }
            }

            if (!exist) {
                res.redirect('/tournament/slot');
            }

            // if (tournament[type].start < currentTime) {
            //     res.redirect('/tournament/slot');
            // }

            let startTime = tournament[type].start;

            res.locals = {...res.locals, title: 'Tournament'};
            res.render('Tournament/test', {
                tournament, type, startTime, currentTime
            });
        },

        getQuestions: async function(req, res) {
            let tournamentId = req.body.tournament_id;
            let type = req.body.type;
            let radio = req.body.radio;
            let questionId = req.body.question_id;
            let telegramId = res.locals.user.telegramId;
            let username = res.locals.user.username;
            let types = ['qualifier', 'quarterfinal', 'semifinal', 'final'];

            try {

                let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');

                if (questionId) {
                    let newData = {
                        telegramId,
                        username,
                        tournament: tournamentId,
                        question_id: questionId,
                        created_at: currentTime,
                        point: 0,
                        testType: type
                    };
                    if (radio) {
                        newData.answer = radio;
                        let question = await QuestionModel.findOne({question_id: questionId});
                        if (radio === question.answer1) {
                            newData.point = 1;
                        }
                    }
                    let item = new TournamentTestModel(newData);
                    await item.save();
                }

                let userScore = await TournamentTestModel.aggregate([
                    {
                        $match: { telegramId: telegramId + '', tournament: tournamentId + '', testType: type }
                    },
                    {
                        $group:
                            {
                                _id: "$tournament",
                                totalScore: { $sum: "point" }
                            }
                    }
                ]);

                let totalScore = 0;
                if (userScore && userScore.length > 0) {
                    totalScore = userScore[0].totalScore;
                }

                await TournamentHistoryModel.update({
                    telegramId: telegramId,
                    tournament: tournamentId,
                    level: types.indexOf(type) + 1,
                }, {$set: {score: totalScore}})

                let tests = await TournamentTestModel.find({tournament: tournamentId + '', telegramId: telegramId + ''}).sort({question_id: -1});


                let tournament = await TournamentModel.findOne({_id: tournamentId});
                let sessionNo = tournament[type].session;
                let questions = await QuestionModel.find({sessionID: sessionNo}).sort({question_id: 1}).lean().exec();

                let timeDiff = moment.utc(moment(currentTime, "YYYY-MM-DD HH:mm:ss").diff(moment(tournament[type].start + ':00', "YYYY-MM-DD HH:mm:ss"))).format("x")
                console.log('time-diff:', timeDiff);

                if (timeDiff / 1000 > questions.length * 20) {
                    await TournamentHistoryModel.update({
                        telegramId: telegramId,
                        tournament: tournamentId,
                        level: types.indexOf(type) + 1,
                    }, {$set: {finished_at: currentTime}})

                    return res.render('Tournament/_end', {layout: false});
                }

                let questionNo = Math.floor(timeDiff / 1000 / 20);
                if (tests && tests.length > 0) {
                    for (let i = 0; i < questions.length; i ++) {
                        if (questions[i].question_id + '' === tests[0].question_id + '') {
                            if (questionNo < i + 1) {
                                questionNo = i + 1;
                                break;
                            }
                        }
                    }
                    if (questionNo === questions.length) {
                        return res.render('Tournament/_end', {layout: false});
                    }
                }
                let totalCount = questions.length;
                let question = questions[questionNo];
                let orders = [1234, 1243, 1324, 1342, 1423, 1432, 2134, 2143, 2314, 2341, 2413, 2431, 3124, 3142, 3214, 3241, 3412, 3421, 4123, 4132, 4213, 4231, 4312, 4321];
                let index = Math.floor(Math.random() * 23);
                let order = orders[index] + '';
                let answers = [];
                for (let i = 0; i < order.length; i ++) {
                    answers.push(question['answer' + order[i]]);
                }

                res.render('Tournament/_quiz', {layout: false, question, questionNo, totalCount, answers, tournament});

            } catch (e) {
                console.log('get-question-error:', e);
                res.render('Tournament/_end', {layout: false});
            }
        },

        getQualifyView: async function(req, res) {
            let telegramId = res.locals.user.telegramId;
            let tournamentId = req.body.tournament_id;
            let tournament = await TournamentModel.findOne({_id: tournamentId});
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            let data = await getQualifyData(tournament, currentTime, telegramId);
            res.render('Tournament/_qualifier', {...data, layout: false, tournament});
        },

        getQuarterView: async function(req, res) {
            let telegramId = res.locals.user.telegramId;
            let tournamentId = req.body.tournament_id;
            let tournament = await TournamentModel.findOne({_id: tournamentId});
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            let data = await getQuarterData(tournament, currentTime, telegramId);
            res.render('Tournament/_quarterfinal', {...data, layout: false, tournament});
        },

        getSemiView: async function(req, res) {
            let telegramId = res.locals.user.telegramId;
            let tournamentId = req.body.tournament_id;
            let tournament = await TournamentModel.findOne({_id: tournamentId});
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            let data = await getSemiData(tournament, currentTime, telegramId);
            res.render('Tournament/_semifinal', {...data, layout: false, tournament});
        },

        getFinalView: async function(req, res) {
            let telegramId = res.locals.user.telegramId;
            let tournamentId = req.body.tournament_id;
            let tournament = await TournamentModel.findOne({_id: tournamentId});
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            let data = await getFinalData(tournament, currentTime, telegramId);
            res.render('Tournament/_final', {...data, layout: false, tournament});
        },

        getWinView: async function(req, res) {
            let telegramId = res.locals.user.telegramId;
            let tournamentId = req.body.tournament_id;
            let tournament = await TournamentModel.findOne({_id: tournamentId});
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            let data = await getFinalData(tournament, currentTime, telegramId);
            res.render('Tournament/_win', {...data, layout: false, tournament});
        }
    };

};
