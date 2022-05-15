const bodyParser = require('body-parser');
const SessionCtrl = require('../controllers/SessionCtrl')();

module.exports = function (app) {

      function isUserAllowed(req, res, next) {
            sess = req.session;
            if (sess.user) {
                  res.locals = {...res.locals, user: sess.user};
                  return next();
            }
            else { res.redirect('/login'); }
      }

      app.get('/', isUserAllowed, SessionCtrl.list);

}
