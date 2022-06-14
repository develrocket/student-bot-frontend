const express = require('express');
const moment = require('moment');
const {validationResult}  = require('express-validator/check');
const GreatPersonModel = require('../models/greatPerson');


module.exports = function(){

    return {
        index: async function(req, res) {
            let persons = await GreatPersonModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Great Person'};
            res.render('GreatPerson/index', {persons});
        },

        create: function(req, res) {
            res.locals = {...res.locals, title: 'Add Great Person'};
            res.render('GreatPerson/create', {});
        },

        doCreate: async function(req, res) {
            let person = new GreatPersonModel({
                name: req.body.name,
                icon: req.file.filename,
                field: req.body.field,
                price: req.body.price,
                status: 1
            });

            await person.save();

            res.redirect('/gp');
        },

        doUpdate: async function(req, res) {
            let id = req.query.id;
            let data = {
                name: req.body.name,
                field: req.body.field,
                price: req.body.price,
            }
            if (req.file) {
                data.icon = req.file.filename;
            }

            await GreatPersonModel.update({_id: id}, {$set: data});

            res.redirect('/gp');
        },

        sendMarket: async function(req, res) {
            let id = req.query.id;
            await GreatPersonModel.update({_id: id}, {$set: {status: 2}});
            return res.json({result: 'success'});
        },

        suspend: async function(req, res) {
            let id = req.query.id;
            await GreatPersonModel.update({_id: id}, {$set: {status: 1}});
            return res.json({result: 'success'});
        },

        update: async function(req, res) {
            let id = req.query.id;
            let person = await GreatPersonModel.findOne({_id: id});
            res.locals = {...res.locals, title: 'Update Great Person'};
            res.render('GreatPerson/edit', {person});
        },
    };

};
