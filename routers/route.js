const bodyParser = require('body-parser');
const SessionCtrl = require('../controllers/SessionCtrl')();
const ProfileCtrl = require('../controllers/ProfileCtrl')();
const RankCtrl = require('../controllers/RankCtrl')();
const WalletCtrl = require('../controllers/WalletCtrl')();
const GreatPersonCtrl = require('../controllers/GreatPersonCtrl')();
const MissionCtrl = require('../controllers/MissionCtrl')();
const MarketCtrl = require('../controllers/MarketCtrl')();
const urlencodeParser = bodyParser.urlencoded({ extended: false });
const config = require('../config/config');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { body } = require('express-validator');
const moment = require('moment');
const MissionHistoryModel = require('../models/missionHistory');
const MissionModel = require('../models/mission');

module.exports = function (app) {

    async function isUserAllowed(req, res, next) {
        let sess = req.session;
        if (config.isDev) {
            let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
            let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
            let telegramId = '865996339';
            let missionHistories = await MissionHistoryModel.find({telegramId: telegramId}).lean().exec();
            let missionIds = missionHistories.map(item => item.mission);
            if (missionIds.length > 0) {
                searchQuery = {...searchQuery, _id: {$nin: missionIds}};
            }
            let missionCount = await MissionModel.count(searchQuery);

            res.locals = {...res.locals, user: {
                    _id: "62811745edc9450e0b407e96",
                    username: 'developer',
                    title: 'student',
                    telegramId: 865996339
                }, searchKey: '', missionCount};
            return next();
        } else {
            if (sess.user) {
                let currentTime = moment.utc().format('YYYY-MM-DD HH:mm');
                let searchQuery = {start_at: {$lte: currentTime}, end_at: {$gte: currentTime}};
                let telegramId = sess.user.telegramId;
                let missionHistories = await MissionHistoryModel.find({telegramId: telegramId}).lean().exec();
                let missionIds = missionHistories.map(item => item.mission);
                if (missionIds.length > 0) {
                    searchQuery = {...searchQuery, _id: {$nin: missionIds}};
                }
                let missionCount = await MissionModel.count(searchQuery);

                res.locals = {...res.locals, user: sess.user, searchKey: '', missionCount};
                return next();
            }
            else { res.redirect('/login'); }
        }

    }

    function isAdminAllowed(req, res, next) {
        if (res.locals.user.telegramId + '' === '865996339') {
            return next();
        } else {
            res.redirect('/');
        }
    }


    //Admin
    app.get('/gp', isUserAllowed, isAdminAllowed, GreatPersonCtrl.index);
    app.get('/gp/send-market', isUserAllowed, isAdminAllowed, GreatPersonCtrl.sendMarket);
    app.get('/gp/suspend', isUserAllowed, isAdminAllowed, GreatPersonCtrl.suspend);
    app.get('/gp/edit', isUserAllowed, isAdminAllowed, GreatPersonCtrl.update);
    app.get('/gp/add', isUserAllowed, isAdminAllowed, GreatPersonCtrl.create);
    app.post('/gp/add', isUserAllowed, isAdminAllowed, urlencodeParser, upload.single('icon'), GreatPersonCtrl.doCreate);
    app.post('/gp/update', isUserAllowed, isAdminAllowed, urlencodeParser, upload.single('icon'), GreatPersonCtrl.doUpdate);

    app.get('/mission', isUserAllowed, isAdminAllowed, MissionCtrl.index);
    app.get('/mission/add', isUserAllowed, isAdminAllowed, MissionCtrl.create);
    app.get('/mission/edit', isUserAllowed, isAdminAllowed, MissionCtrl.edit);
    app.post('/mission/add', isUserAllowed, isAdminAllowed, urlencodeParser, upload.fields([{name: 'banner', maxCount: 1}, {name: 'badge', maxCount: 1}]), MissionCtrl.doCreate);
    app.post('/mission/edit', isUserAllowed, isAdminAllowed, urlencodeParser, upload.fields([{name: 'banner', maxCount: 1}, {name: 'badge', maxCount: 1}]), MissionCtrl.doUpdate);


    // User

    app.get('/', isUserAllowed, ProfileCtrl.index);
    app.get('/session', isUserAllowed, SessionCtrl.list);
    app.get('/rank', isUserAllowed, RankCtrl.index);
    app.get('/wallet', isUserAllowed, WalletCtrl.index);
    app.post('/withdraw/frt', urlencodeParser, isUserAllowed, WalletCtrl.withdraw);
    app.post('/profile/update-motto', urlencodeParser, isUserAllowed, ProfileCtrl.updateMotto);
    app.post('/profile/update-country', urlencodeParser, isUserAllowed, ProfileCtrl.updateCountryCode);

    app.get('/market', isUserAllowed, MarketCtrl.index);
    app.get('/market/create-offer', isUserAllowed, MarketCtrl.createOffer);
    app.get('/market/edit-offer', isUserAllowed, MarketCtrl.editOffer);
    app.post('/market/create-offer', isUserAllowed, urlencodeParser, MarketCtrl.doCreateOffer);
    app.post('/market/edit-offer', isUserAllowed, urlencodeParser, MarketCtrl.doEditOffer);
    app.post('/market/search-buys', isUserAllowed, urlencodeParser, MarketCtrl.searchBuys);
    app.post('/market/load-more-buys', isUserAllowed, urlencodeParser, MarketCtrl.loadMoreBuys);
    app.post('/market/remove-offer', isUserAllowed, urlencodeParser, MarketCtrl.removeOffer);
    app.post('/market/buy-skill', isUserAllowed, urlencodeParser, MarketCtrl.buySkill);
    app.post('/market/rent-great', isUserAllowed, urlencodeParser, MarketCtrl.rentGreat);

    app.get('/tasks', isUserAllowed, MissionCtrl.studentIndex);
    app.get('/mission/check', isUserAllowed, MissionCtrl.check);
    app.get('/mission/complete', isUserAllowed, MissionCtrl.complete);
    app.post('/mission/search', isUserAllowed, urlencodeParser, MissionCtrl.search);
    app.post('/mission/load-more', isUserAllowed, urlencodeParser, MissionCtrl.loadMore);
    app.post('/mission/rent-great', isUserAllowed, urlencodeParser, MissionCtrl.rentGreat   );
}
