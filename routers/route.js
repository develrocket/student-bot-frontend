const bodyParser = require('body-parser');
const SessionCtrl = require('../controllers/SessionCtrl')();
const config = require('../config/config');

module.exports = function (app) {

    function isUserAllowed(req, res, next) {
        sess = req.session;
        if (config.isDev) {
            res.locals = {...res.locals, user: {
                    username: 'developer'
                }};
            return next();
        } else {
            if (sess.user) {
                res.locals = {...res.locals, user: sess.user};
                return next();
            }
            else { res.redirect('/login'); }
        }

    }

    app.get('/', isUserAllowed, SessionCtrl.list);

}
