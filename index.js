const app = require('express')();
const moment = require('moment');
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
const StudentApiController = require('./controllers/Api/studentCont')();
const TelegramBot = require('node-telegram-bot-api');
const token = '5326855662:AAF1R4AaVYq4w5G3aiw4vix9XferGNFYaJ8';
const bot = new TelegramBot(token, {polling: true});
const FortunaHistoryModel = require('./models/fortunaHistory');
const StudentModel = require('./models/student');
const StudentResultModel = require('./models/studentResult');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


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
app.use('/uploads', express.static('uploads'));

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

io.on('connection', (socket) => {
    console.log('a user connected');
});

// setInterval(function() {
//     io.emit('news_updated', { content: 'This is test' });
// }, 10000);

db.on('connected', () => {
    server.listen(config.server.port, () => {
        console.log(`www.${config.server.hostname  }:${  config.server.port}`);
        debug(`App listening on ${config.server.hostname} port: ${config.server.port}`);
        app.emit('appStarted');

        cronService.start(io, bot);
        cronService.checkMission(bot);
        cronService.checkComplete(bot);
        // StudentApiController.getResultAll();
        // StudentApiController.resetSkillScore();
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
            telegramId: senderId,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            fortuna_point: -value,
            state: 2,
            receiverId: receiverId,
            receiverName: receiverName
        });

        await sItem.save();

        let rItem = new FortunaHistoryModel({
            telegramId: receiverId,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            fortuna_point: value,
            state: 1,
            senderId: senderId,
            senderName: senderName
        });

        await rItem.save();

        return 0;
    } catch (error) {
        console.log('save-error:', error);
        return 2;
    }
}

bot.on('message', async (msg) => {
    console.log('tele-new-message:', msg);

    if (msg.reply_to_message && Object.keys(msg.reply_to_message).length > 0) {
        try {
            if (msg.text.indexOf('/give') >= 0) {
                let value = 0;
                let parts = msg.text.split(' ');
                for (let i = 1; i < parts.length; i++) {
                    if (parts[i].trim())  {
                        value = parts[i].trim();
                        break;
                    }
                }
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
            } else {
                console.log('**** not found tip:', msg.text.indexOf('/give'));
            }
        } catch (error) {
            console.log('+++++++++++ error occurred:', error);
        }
    }
});

bot.onText(/\/give/, async (msg) => {
    if (msg.text.split(' ').length < 3) return;

    let parts = msg.text.split(' ');
    let receiverName = '';
    let value = '';
    for (let i = 1; i < parts.length; i ++) {
        if (parts[i].trim())  {
            if (!receiverName) {
                receiverName = parts[i].trim();
            } else {
                if (!value) {
                    value = parts[i].trim();
                }
            }
        }
    }

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
            // console.log('~~~~~~~~~~~~~~~~~~~~~ send *success* message to', msg.chat.id, msg.from.username);
            bot.sendMessage(msg.chat.id, "🤑 @" + senderName + " tipped @" + receiverName + " with " + value + " Fortuna!");
        } else if (result == 1) {
            // console.log('~~~~~~~~~~~~~~~~~~~~~ send ^balance^ message to', msg.chat.id, msg.from.username);
            bot.sendMessage(msg.chat.id, "🤑 You have insufficient Fortuna into your account. Get smarter! Get Fortuna by answering to quizzes.");
        }
    } else if (!receiverId) {
        // console.log('~~~~~~~~~~~~~~~~~~~~~ send @user@ message to', msg.chat.id, msg.from.username);
        bot.sendMessage(msg.chat.id, "🤑 Receiver is not user of Myafrica.link .");
    } else {
        // console.log('~~~~~~~~~~~~~~~~~~~~~ send $value$ message to', msg.chat.id, msg.from.username);
        bot.sendMessage(msg.chat.id, "🤑 Value must be between 0.05 to 5 FRT otherwise rejected.");
    }
});
