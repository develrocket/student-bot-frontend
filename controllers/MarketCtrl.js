const express = require('express');
const moment = require('moment');

const OfferModel = require('../models/offer');
const GreatPersonModel = require('../models/greatPerson');
const axios = require('axios').default;
const Utils = require('../helpers/utils');
const SkillHistoryModel = require('../models/skillHistory');
const SkillModel = require('../models/skill');
const FortunaHistoryModel = require('../models/fortunaHistory');
const OrderHistoryModel = require('../models/orderHistory');
const RentHistoryModel = require('../models/rentHistory');

module.exports = function(){

    return {
        index: async function(req, res) {
            let telegramId =  res.locals.user.telegramId;
            let searchQuery = {
                telegramId: {$ne: telegramId},
                status: 1,
                amount: {$gt: 0}
            }
            let offers = await OfferModel.find(searchQuery).lean().exec();
            let offersCount = await OfferModel.count(searchQuery);
            let myOffers = await OfferModel.find({telegramId: telegramId}).lean().exec();
            let persons = await RentHistoryModel.find({telegramId: telegramId, isUsed: 0}).lean().exec();
            let personIds = persons.map(item => item.person);
            let greats = [];
            if (personIds.length > 0) {
                greats = await GreatPersonModel.find({status: 2, _id: {$nin: personIds}}).lean().exec();
            } else {
                greats = await GreatPersonModel.find({status: 2}).lean().exec();
            }

            let skills = await SkillModel.find({}).lean().exec();
            res.locals = {...res.locals, title: 'Skills Market', moment };
            let showBuysMore = offersCount > 15 ? true: false;
            res.render('SkillMarket/index', {offers, greats, myOffers, skills, offersCount, showBuysMore, 'message': req.flash('message'), 'error': req.flash('error')});
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
                if (skillHistories[j].totalPoints * 1 >= 1) {
                    mySkills[skillHistories[j]._id] = (skillHistories[j].totalPoints * 1).toFixed(1)
                }
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
        },

        buySkill: async function(req, res) {
            let offerId = req.body.offerId;
            let amount = req.body.amount;
            let telegramid = res.locals.user.telegramId;

            let fResults = await FortunaHistoryModel.aggregate([
                {
                    $match: { telegramId: telegramid + '' }
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
            let offer = await OfferModel.findOne({_id: offerId});
            console.log(offerId);
            if (offer.amount < amount) {
                req.flash('error', 'Offer changed! Please try again');
                return res.redirect('/market');

            }
            let totalPrice = ((amount * offer.price).toFixed(1)) * 1;
            if (totalFortuna < totalPrice) {
                req.flash('error', "You don't have enough fortuna to buy skills.");
                return res.redirect('/market');
            }

            let order = new OrderHistoryModel({
                telegramId: telegramid,
                username: res.locals.user.username,
                offer: offerId,
                price: offer.price,
                amount: amount,
                total: totalPrice
            });

            await order.save();

            let buySkillHistory = new SkillHistoryModel({
                telegramId: telegramid,
                skill: offer.skill,
                score: amount,
                offer: offer._id
            });

            await buySkillHistory.save();

            let sellSkillHistory = new SkillHistoryModel({
                telegramId: offer.telegramId,
                skill: offer.skill,
                score: amount * -1,
                offer: offer._id
            });

            await sellSkillHistory.save();

            await OfferModel.update({
                _id: offerId
            }, {
                $set: {amount: offer.amount * 1 - amount}
            });

            let buyHistory = new FortunaHistoryModel({
                telegramId: telegramid,
                fortuna_point: totalPrice * -1,
                state: 5,
                receiverId: offer.telegramId,
                receiverName: offer.username,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });

            await buyHistory.save();

            let sellHistory = new FortunaHistoryModel({
                telegramId: offer.telegramId,
                fortuna_point: totalPrice,
                state: 6,
                senderId: telegramid,
                senderName: res.locals.user.username,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });

            await sellHistory.save();

            req.flash('message', "You bought skill successfully!");
            return res.redirect('/market');
        },

        rentGreat: async function (req, res) {
            let personId = req.body.personId;
            let telegramId = res.locals.user.telegramId;

            let rentHistory = await RentHistoryModel.find({
                isUsed: 0,
                person: personId,
                telegramId: telegramId
            });

            let person = await GreatPersonModel.findOne({_id: personId});

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

            if (totalFortuna < person.price ){
                req.flash('message', "You don't have enough fortuna to rent!");
                return res.redirect('/market');
            }

            if (rentHistory.length === 0) {
                let history = new RentHistoryModel({
                    isUsed: 0,
                    person: person._id,
                    telegramId: telegramId,
                    amount: person.price
                });
                await history.save();

                let fHistory = new FortunaHistoryModel({
                    telegramId: telegramId,
                    fortuna_point: person.price * -1,
                    person: person._id,
                    state: 4,
                    created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                });
                await fHistory.save();
            }

            req.flash('message', "You rent great person successfully!");
            return res.redirect('/market');
        }
    };

};
