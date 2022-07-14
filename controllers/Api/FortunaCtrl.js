const express = require('express');

const axios = require('axios').default;

const LanguageModel = require('../../models/language');
const LevelModel = require('../../models/level');
const TypeModel = require('../../models/type');
const FortunaSessionModel = require('../../models/fortunaSession');
const QuestionModel = require('../../models/question');


const ServerUrl = 'http://fortunaenglish.com/api';

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
            let questions = await QuestionModel.find({}).lean().exec();
            let questionIds = questions.map(item => item.question_id);
            let sessionIds = sessions.map(item => item.session_id);

            try {
                let config = {
                    method: 'get',
                    url: ServerUrl + '/fetch/session',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                };

                let result = await axios(config);

                for (const item of result.data) {
                    config.url = ServerUrl + '/fetch/question?sessId=' + item.id;
                    let qresult = await axios(config);

                    for (const qitem of qresult.data) {
                        if (questionIds.indexOf(item.id) >= 0) {
                            await QuestionModel.update({question_id: qitem.id}, {$set: qitem});
                        } else {
                            let question = new QuestionModel({...qitem, question_id: qitem.id});
                            await question.save();
                        }
                    }

                    item.questions = qresult.data.length;
                    if (item.questions === 0) continue;

                    if (sessionIds.indexOf(item.id) >= 0) {
                        await FortunaSessionModel.update({session_id: item.id}, {
                            $set: item
                        })
                    } else {
                        let session = new FortunaSessionModel({...item, session_id: item.id});
                        await session.save();
                    }
                }
            } catch (e) {
                console.log('fetch-livesession-error:', e);
            }



            // return res.json({result: 'success'});
        }
    }
};