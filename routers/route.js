const bodyParser = require('body-parser');
const SessionCtrl = require('../controllers/SessionCtrl')();
const ProfileCtrl = require('../controllers/ProfileCtrl')();
const RankCtrl = require('../controllers/RankCtrl')();
const config = require('../config/config');

module.exports = function (app) {

    function isUserAllowed(req, res, next) {
        sess = req.session;
        if (config.isDev) {
            res.locals = {...res.locals, user: {
                    username: 'developer',
                    title: 'student',
                    telegramId: 19867578885
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

}
