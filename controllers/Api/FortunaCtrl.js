const express = require('express');

const axios = require('axios').default;

const LanguageModel = require('../../models/language');
const LevelModel = require('../../models/level');
const TypeModel = require('../../models/type');
const FortunaSessionModel = require('../../models/fortunaSession');
const QuestionModel = require('../../models/question');


const ServerUrl = 'http://fortunaenglish.loc/api';

module.exports = function() {
    return {
        fetchLanguage: async function(req, res) {

            let languages = await LanguageModel.find({});

            let config = {
                method: 'get',
                url: ServerUrl + '/fetch/languages',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            let result = await axios(config);
            for (const item of result.data) {
                let exists = languages.filter(litem => litem.name + '' === item.language + '');
                if (exists.length === 0) {
                    let language = new LanguageModel({
                        name: item.language,
                        isDeleted: item.is_deleted
                    });
                    await language.save();
                }
            }

            // return res.json({result: 'success'});
        },
        fetchLevel: async function(req, res) {
            let levels = await LevelModel.find({});

            let config = {
                method: 'get',
                url: ServerUrl + '/fetch/level',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            let result = await axios(config);

            for (const item of result.data) {
                let exists = levels.filter(litem => litem.name + '' === item.name + '');
                if (exists.length === 0) {
                    let level = new LevelModel(item);
                    await level.save();
                }
            }

            // return res.json({result: 'success'});
        },
        fetchType: async function(req, res) {
            let types = await TypeModel.find({});

            let config = {
                method: 'get',
                url: ServerUrl + '/fetch/type',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            let result = await axios(config);

            for (const item of result.data) {
                let exists = types.filter(litem => litem.type + '' === item.type + '');
                if (exists.length === 0) {
                    let level = new TypeModel(item);
                    await level.save();
                }
            }

            // return res.json({result: 'success'});
        },
        fetchSession: async function(req, res) {
            let sessions = await FortunaSessionModel.find({}).lean().exec();
            let questions = await QuestionModel.find({}).sort({updated_at: -1}).lean().exec();
            let questionIds = questions.map(item => item.question_id);
            let sessionIds = sessions.map(item => item.session_id);
            let lastUpdated = '';
            if (questions.length > 0) {
                lastUpdated = questions[0].updated_at;
            }


            try {
                console.log('begin-fetch-questions:', lastUpdated);
                let config = {
                    method: 'get',
                    url: ServerUrl + '/fetch/session',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                };

                while(1) {
                    config.url = ServerUrl + '/fetch/question?updated_at=' + lastUpdated;
                    let qresult = await axios(config);
                    let newIds = [];

                    for (const qitem of qresult.data) {
                        if (questionIds.indexOf(qitem.id) >= 0) {
                            await QuestionModel.update({question_id: qitem.id}, {$set: {...qitem, sessionID: qitem.session1}});
                        } else {
                            newIds.push(qitem.id);
                            questionIds.push(qitem.id);
                            let question = new QuestionModel({...qitem, question_id: qitem.id, sessionID: qitem.session1});
                            await question.save();
                        }
                        if (sessionIds.indexOf(qitem.session1) >= 0) {
                            await FortunaSessionModel.update({session_id: qitem.session1}, {
                                $inc: {questions: 1}
                            })
                        } else {
                            let session = new FortunaSessionModel({
                                session_id: qitem.session1,
                                session: qitem.session1,
                                level: qitem.level,
                                language: qitem.language,
                                questions: 1
                            });
                            await session.save();
                            sessionIds.push(qitem.session1);
                        }

                        lastUpdated = qitem.updated_at;
                    }
                    if (newIds.length === 0) break;
                }

            } catch (e) {
                console.log('fetch-livesession-error:', e);
            }


            // return res.json({result: 'success'});
        }
    }
};