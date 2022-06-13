const bodyParser = require('body-parser');
const SessionCtrl = require('../controllers/SessionCtrl')();
const ProfileCtrl = require('../controllers/ProfileCtrl')();
const RankCtrl = require('../controllers/RankCtrl')();
const WalletCtrl = require('../controllers/WalletCtrl')();
const GreatPersonCtrl = require('../controllers/GreatPersonCtrl')();
const MissionCtrl = require('../controllers/MissionCtrl')();
const urlencodeParser = bodyParser.urlencoded({ extended: false });
const config = require('../config/config');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { body } = require('express-validator');


module.exports = function (app) {

    function isUserAllowed(req, res, next) {
        sess = req.session;
        if (config.isDev) {
            res.locals = {...res.locals, user: {
                    _id: "62811745edc9450e0b407e96",
                    username: 'developer',
                    title: 'student',
                    telegramId: 865996339
                }, searchKey: ''};
            return next();
        } else {
            if (sess.user) {
                res.locals = {...res.locals, user: sess.user, searchKey: ''};
                return next();
            }
            else { res.redirect('/login'); }
        }

    }

    app.get('/', isUserAllowed, ProfileCtrl.index);
    app.get('/session', isUserAllowed, SessionCtrl.list);
    app.get('/rank', isUserAllowed, RankCtrl.index);
    app.get('/wallet', isUserAllowed, WalletCtrl.index);
    app.post('/withdraw/frt', urlencodeParser, isUserAllowed, WalletCtrl.withdraw);
    app.post('/profile/update-motto', urlencodeParser, isUserAllowed, ProfileCtrl.updateMotto);
    app.post('/profile/update-country', urlencodeParser, isUserAllowed, ProfileCtrl.updateCountryCode);


    //Admin
    app.get('/gp', isUserAllowed, GreatPersonCtrl.index);
    app.get('/gp/send-market', isUserAllowed, GreatPersonCtrl.sendMarket);
    app.get('/gp/suspend', isUserAllowed, GreatPersonCtrl.suspend);
    app.get('/gp/edit', isUserAllowed, GreatPersonCtrl.update);
    app.get('/gp/add', isUserAllowed, GreatPersonCtrl.create);
    app.post('/gp/add', isUserAllowed, urlencodeParser, upload.single('icon'), GreatPersonCtrl.doCreate);
    app.post('/gp/update', isUserAllowed, urlencodeParser, upload.single('icon'), GreatPersonCtrl.doUpdate);

    app.get('/mission', isUserAllowed, MissionCtrl.index);
    app.get('/mission/add', isUserAllowed, MissionCtrl.create);
}
