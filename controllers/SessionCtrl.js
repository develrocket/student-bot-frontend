const express = require('express');
const moment = require('moment');
const paginate = require('express-paginate');

const SessionModel = require('../models/sessionResult');

module.exports = function(){

    return {
        list: async function(req, res) {
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
