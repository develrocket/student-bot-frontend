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
const cronService = require('./cronService')();
const TelegramBot = require('node-telegram-bot-api');
const token = '5356303521:AAFu494SZVr82jDE8mA65z_-w8s_EJFw8Pw';
const bot = new TelegramBot(token, {polling: true});
const FortunaHistoryModel = require('./models/fortunaHistory');
const StudentModel = require('./models/student');
const StudentResultModel = require('./models/studentResult');

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

        cronService.start();
    });
});


async function transferFortuan(senderId, senderName, receiverId, receiverName, value) {
    let result = await FortunaHistoryModel.aggregate([
        {
            $match: { telegramId: senderId + '' }
        },
        {
            $group:
                {
                    _id: "$telegramId",
                    totalPoints: { $sum: "$fortuna_point" }
                }
        }
    ]);

    let totalPoints = result.length > 0 ? result[0].totalPoints : 0;

    if (totalPoints < value) {
        return 1; // Insufficient Fund
    }

    try {
        let sItem = new FortunaHistoryModel({
            telegramId: myTelegramId,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            fortuna_point: -value,
            state: 2,
            receiverId: receiverId,
            receiverName: receiverName
        });

        await sItem.save();

        let rItem = new FortunaHistoryModel({
            telegramId: myTelegramId,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            fortuna_point: value,
            state: 1,
            senderId: senderId,
            senderName: senderName
        });

        await rItem.save();

        return 0;
    } catch (error) {
        return 2;
    }
}

bot.on('message', async (msg) => {
    console.log('telegram-bot-new-msg:', msg);
    if (msg.reply_to_message && Object.keys(msg.reply_to_message).length > 0) {
        if (msg.text.indexOf('/tip') >= 0) {
            let value = msg.text.split(' ')[1];
            value = value * 1;
            if (value >= 0.05 && value <= 5) {
                let senderId = msg.from.id;
                let senderName = msg.from.username;
                let receiverId = msg.reply_to_message.from.id;
                let receiverName = msg.reply_to_message.from.username;

                let result = await transferFortuan(senderId, senderName, receiverId, receiverName, value);

                if (result == 0) {
                    bot.sendMessage(msg.chat.id, "🤑 @" + senderName + " tipped @" + receiverName + " with " + value + " Fortuna!");
                } else if (result == 1) {
                    bot.sendMessage(msg.chat.id, "🤑 You have insufficient Fortuna into your account. Get smarter! Get Fortuna by answering to quizzes.");
                }
            } else {
                bot.sendMessage(msg.chat.id, "🤑 Value must be between 0.05 to 5 FRT otherwise rejected.");
            }
        }
    }
});

bot.onText(/\/tip/, async (msg) => {
    console.log('tele-tip-msg:', msg);
    if (msg.text.split(' ').length < 3) return;
    let receiverName = msg.text.split(' ')[1].trim();
    let value = msg.text.split(' ')[2].trim();

    if (receiverName.indexOf('@') >= 0) {
        receiverName = receiverName.substr(1);
    }

    let receiverId = '';

    let student = await StudentModel.find({username: receiverName}).lean().exec();
    if (student.length > 0) {
        student = student[0];
        receiverId = student.telegramId;
    } else {
        student = await StudentResultModel.find({usernane: receiverName}).lean().exec();
        if (student.length > 0) {
            student = student[0];
            receiverId = student.telegramId;
        }
    }

    if (receiverId && value * 1 >= 0.05 && value * 1 <= 5) {
        let senderId = msg.from.id;
        let senderName = msg.from.username;

        let result = await transferFortuan(senderId, senderName, receiverId, receiverName, value);

        if (result == 0) {
            bot.sendMessage(msg.chat.id, "🤑 @" + senderName + " tipped @" + receiverName + " with " + value + " Fortuna!");
        } else if (result == 1) {
            bot.sendMessage(msg.chat.id, "🤑 You have insufficient Fortuna into your account. Get smarter! Get Fortuna by answering to quizzes.");
        }
    } else if (!receiverId) {
        bot.sendMessage(msg.chat.id, "🤑 Receiver is not user of Myafrica.link .");
    } else {
        bot.sendMessage(msg.chat.id, "🤑 Value must be between 0.05 to 5 FRT otherwise rejected.");
    }
});
