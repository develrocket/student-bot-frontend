const express = require('express');
const moment = require('moment');
const paginate = require('express-paginate');

const SessionModel = require('../models/sessionResult');
const axios = require('axios').default;

const fetchSession = async function() {
    let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
    let lastId = sessions[0].session_no;
    try {
        let res = await axios.get('https://fortunaenglish.com/api/fetch/livesession?lastId=' + lastId);

        for (const sessionItem of res.data) {
            const newSessionItem = new SessionModel();
            newSessionItem.language = sessionItem.language;
            newSessionItem.session_type = sessionItem.type;
            newSessionItem.session_name = sessionItem.session_name;
            newSessionItem.session_no = sessionItem.id;
            newSessionItem.session_start = sessionItem.start_time;
            newSessionItem.questions_no = sessionItem.questions;
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
            await fetchSession();

            const searchKey = req.query.search || '';
            let searchQuery = {};
            if (searchKey) {
                searchQuery = {$or: [
                        {session_name: {$regex: searchKey}},
                        {session_type: {$regex: searchKey}},
                        {language: {$regex: searchKey}},
                        {session_no: searchKey}
                    ]}
            }
            const [ sessions, itemCount ] = await Promise.all([
                SessionModel.find(searchQuery).sort({session_no: -1}).limit(req.query.limit).skip(req.skip).lean().exec(),
                SessionModel.count(searchQuery)
            ]);
            const pageCount = Math.ceil(itemCount / req.query.limit);

            res.locals = {...res.locals, title: 'Sessions', moment };
            res.render('Session/index', {
                sessions,
                pageCount,
                itemCount,
                searchKey,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
            });
        },
    };

};
