const bodyParser = require('body-parser');
const SessionCtrl = require('../controllers/SessionCtrl')();
const ProfileCtrl = require('../controllers/ProfileCtrl')();
const RankCtrl = require('../controllers/RankCtrl')();
const WalletCtrl = require('../controllers/WalletCtrl')();
const urlencodeParser = bodyParser.urlencoded({ extended: false });
const config = require('../config/config');

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


}
