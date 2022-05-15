const app = require('express')();

const express = require('express');
const paginate = require('express-paginate');
const path = require('path');

require('dotenv').config();

// import controller
const AuthController = require('./controllers/AuthController');

// import Router file
const pageRouter = require('./routers/route');

const session = require('express-session');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const i18n = require("i18n-express");
app.use(bodyParser.json());

const config = require('./config/config');
const db = require('./config/db');
const debug = require('debug')('myapp:app');

app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 1200000
    }
}));

app.use(paginate.middleware(10, 50));
app.use(session({ resave: false, saveUninitialized: true, secret: 'nodedemo' }));
app.use(flash());
app.use(i18n({
    translationsPath: path.join(__dirname, 'i18n'), // <--- use here. Specify translations files path.
    siteLangs: ["es", "en", "de", "ru", "it", "fr"],
    textsVarName: 'translation'
}));

app.use('/public', express.static('public'));

app.get('/layouts/', function (req, res) {
    res.render('view');
});

// apply controller
AuthController(app);

//For set layouts of html view
const expressLayouts = require('express-ejs-layouts');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);

// Define All Route
pageRouter(app);
require('./routers/api')(app);


// http.listen(8000, function () {
//     console.log('listening on *:8000');
// });

db.on('connected', () => {
    app.listen(config.server.port, () => {
        console.log(`www.${config.server.hostname  }:${  config.server.port}`);
        debug(`App listening on ${config.server.hostname} port: ${config.server.port}`);
        app.emit('appStarted');
    });
});
