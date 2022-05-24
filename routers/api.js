/* eslint-disable global-require, func-names */

const studentCont = require('../controllers/Api/studentCont')();
const importCont = require('../controllers/Api/importCont')();
const bodyParser = require('body-parser');
const urlencodeParser = bodyParser.urlencoded({ extended: false });

module.exports = function (app) {
    // home
    app.use('/api', require('../controllers/Api/home'));

    app.get('/api/import-excel', importCont.importExcel);

    app.post('/api/get_session_data', urlencodeParser, importCont.getSessionData);
    app.post('/api/get_student_results', urlencodeParser, importCont.getStudentResult);

    app.get('/api/student_result', studentCont.filter);
    app.get('/api/sort_student', studentCont.sort);
    app.get('/api/up_rank', studentCont.upRank);
    app.get('/api/student_info', studentCont.getInfo);
    app.get('/api/get_all_fortuna', studentCont.getAllFortuna);
    app.get('/api/fetch-session', studentCont.fetchSession);
    app.get('/api/set-player-count', studentCont.setPlayerCount);
    app.get('/api/reset-session-id', studentCont.resetSessionId);
    app.get('/api/reset-fortuna-points', studentCont.resetFortunaPoint);
};
