const express = require('express');
const moment = require('moment');

const OfferModel = require('../models/offer');
const GreatPersonModel = require('../models/greatPerson');
const axios = require('axios').default;
const Utils = require('../helpers/utils');
const SkillHistoryModel = require('../models/skillHistory');
const SkillModel = require('../models/skill');

module.exports = function(){

    return {
        index: async function(req, res) {
            let telegramId =  res.locals.user.telegramId;
            let offers = await OfferModel.find({status: 1}).limit(15).lean().exec();
            let offersCount = await OfferModel.count({status: 1});
            let myOffers = await OfferModel.find({telegramId: telegramId}).lean().exec();
            let greats = await GreatPersonModel.find({status: 2}).lean().exec();
            let skills = await SkillModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Skills Market', moment };
            let showBuysMore = offersCount > 15 ? true: false;
            res.render('SkillMarket/index', {offers, greats, myOffers, skills, offersCount, showBuysMore});
        },

        createOffer: async function(req, res) {
            let telegramId =  res.locals.user.telegramId;
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
            for (let j = 0; j < skillHistories.length; j ++) {
                mySkills[skillHistories[j]._id] = (skillHistories[j].totalPoints * 1).toFixed(1)
            }

            res.locals = {...res.locals, title: 'Post New Offer' };
            res.render('SkillMarket/createOffer', {mySkills});
        },

        editOffer: async function(req, res) {
            let id = req.query.id;
            let offer = await OfferModel.findOne({_id: id});
            let telegramId =  res.locals.user.telegramId;
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
            for (let j = 0; j < skillHistories.length; j ++) {
                mySkills[skillHistories[j]._id] = (skillHistories[j].totalPoints * 1).toFixed(1)
            }

            res.locals = {...res.locals, title: 'Post New Offer' };
            res.render('SkillMarket/editOffer', {mySkills, offer});
        },

        doCreateOffer: async function(req, res) {
            let data = {
                telegramId: res.locals.user.telegramId,
                username: res.locals.user.username,
                skill: req.body.skill,
                price: req.body.price,
                amount: req.body.points,
                status: 1
            };

            let item = new OfferModel(data);
            await item.save();

            res.redirect('/market');
        },

        doEditOffer: async function(req, res) {
            let data = {
                telegramId: res.locals.user.telegramId,
                username: res.locals.user.username,
                skill: req.body.skill,
                price: req.body.price,
                amount: req.body.points,
                status: 1
            };

            await OfferModel.update({_id: req.query.id}, {$set: data});

            res.redirect('/market');
        },

        searchBuys: async function(req, res) {
            let filter = req.body.filter;
            let index = req.body.page;
            let key = req.body.key;

            let searchQuery = {status: 1};
            if (filter) {
                searchQuery = {...searchQuery, skill: filter};
            }
            if (key) {
                searchQuery = {...searchQuery, username: {$regex: key}};
            }

            let offers = await OfferModel.find(searchQuery).limit(15).skip(index * 15).lean().exec();
            let offersCount = await OfferModel.count(searchQuery);
            let skills = await SkillModel.find({}).lean().exec();
            let showBuysMore = offersCount > index * 15 + 15 ? true: false;

            res.render('SkillMarket/_buys_part', {offers, skills, offersCount, layout: false, showBuysMore});
        },

        loadMoreBuys: async function(req, res) {
            let filter = req.body.filter;
            let index = req.body.page;
            let key = req.body.key;

            let searchQuery = {status: 1};
            if (filter) {
                searchQuery = {...searchQuery, skill: filter};
            }
            if (key) {
                searchQuery = {...searchQuery, username: {$regex: key}};
            }

            let offers = await OfferModel.find(searchQuery).limit(15).skip(index * 15).lean().exec();

            res.render('SkillMarket/_buys_item', {offers, layout: false});
        },

        removeOffer: async function(req, res) {
            let id = req.body.id;
            await OfferModel.remove({telegramId: res.locals.user.telegramId, _id: id});
            res.json({result: 'success'});
        }
    };

};
