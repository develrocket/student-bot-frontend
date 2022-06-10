const express = require('express');
const moment = require('moment');
const paginate = require('express-paginate');

const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const StudentModel = require('../models/student');
const axios = require('axios').default;

const fetchSession = async function() {
    let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
    let lastId = sessions.length > 0 ? sessions[0].session_no : 0;
    try {
        let config = {
            method: 'get',
            url: 'https://fortunaenglish.com/api/fetch/livesession?lastId=' + lastId,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        let res = await axios(config);

        for (const sessionItem of res.data) {
            const newSessionItem = new SessionModel();
            newSessionItem.language = sessionItem.language;
            newSessionItem.session_type = sessionItem.type;
            newSessionItem.session_name = sessionItem.session_name;
            newSessionItem.session_no = sessionItem.id;
            newSessionItem.session_start = sessionItem.start_time.replaceAll('/', '-');
            newSessionItem.questions_no = sessionItem.questions;
            newSessionItem.level = sessionItem.level;
            await newSessionItem.save();
        }
        console.log('insert-new-session:', res.data.length);
    } catch (err) {
        console.log(err);
    }
}

module.exports = function(){

    return {
        list: async function(req, res) {
            // await fetchSession();

            const searchKey = req.query.search || '';
            let start = req.query.start || '';
            let end = req.query.end || '';
            const sort = req.query.sort || 0;

            let searchQuery = {};
            if (searchKey) {
                searchQuery = {$or: [
                        {session_name: {$regex: searchKey}},
                        {session_type: {$regex: searchKey}},
                        {language: {$regex: searchKey}},
                        {session_no: searchKey}
                    ]}
            }

            if (start) {
                let newEnd = moment(end).add(1, 'days').format('YYYY-MM-DD');
                searchQuery = {...searchQuery, session_start: {$gte: start, $lt: newEnd}}
            }

            let sortOption = {session_no: -1};
            if (sort * 1 === 1) {
                sortOption = {session_no: 1};
            } else if (sort * 1 === 2) {
                sortOption = {playerCount: -1};
            } else if (sort * 1 === 3) {
                sortOption = {playerCount: 1};
            }

            const [ sessions, itemCount ] = await Promise.all([
                SessionModel.find(searchQuery).sort(sortOption).limit(req.query.limit).skip(req.skip).lean().exec(),
                SessionModel.count(searchQuery)
            ]);
            const pageCount = Math.ceil(itemCount / req.query.limit);

            for (let i = 0; i < sessions.length; i ++) {
                let results = await ResultModel.find({session_no: sessions[i].session_no}).lean().exec();
                results.sort((a, b) => a.session_rank - b.session_rank);
                for (let j = 0; j < results.length; j ++) {
                    let user = await StudentModel.findOne({telegramId: results[j].telegramId});
                    results[j].country =  user ? (user.countryCode ? user.countryCode : 'af') : 'af';
                }
                sessions[i].players = results;
            }

            res.locals = {...res.locals, title: 'Sessions', moment };
            res.render('Session/index', {
                sessions,
                pageCount,
                itemCount,
                searchKey,
                start,
                end,
                sort,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
            });
        },
    };

};
