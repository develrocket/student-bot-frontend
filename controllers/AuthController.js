const express = require('express');
const bodyParser = require('body-parser');
const urlencodeParser = bodyParser.urlencoded({ extended: false });

const validator = require('express-validator');
const config = require('../config/config');
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

// This sets the mock adapter on the default instance
const mock = new MockAdapter(axios);

const TOKEN = '5356303521:AAFu494SZVr82jDE8mA65z_-w8s_EJFw8Pw';
const {TelegramLogin} = require('node-telegram-login');
const MySiteLogin = new TelegramLogin(TOKEN);
const StudentModel = require('../models/student');



// Mock GET request to /users when param `searchText` is 'John'
mock.onGet("/users", { params: { searchText: "John" } }).reply(200, {
	users: users,
});

module.exports = function (app) {


	// Auth Pages

	app.get('/pages-maintenance', function (req, res) {
		res.locals = { title: 'Maintenance' };
		res.render('Pages/pages-maintenance');
	});
	app.get('/pages-comingsoon', function (req, res) {
		res.locals = { title: 'Coming Soon' };
		res.render('Pages/pages-comingsoon');
	});
	app.get('/pages-404', function (req, res) {
		res.locals = { title: 'Error 404' };
		res.render('Pages/pages-404');
	});
	app.get('/pages-500', function (req, res) {
		res.locals = { title: 'Error 500' };
		res.render('Pages/pages-500');
	});


	// app.get('/login', function (req, res) {
	// 	res.render('Auth/auth-login', { 'message': req.flash('message'), 'error': req.flash('error') });
	// });

	app.get('/login', function (req, res) {
		res.render('Auth/tele-login', { 'message': req.flash('message'), 'error': req.flash('error') });
	});

	// app.get('/login', MySiteLogin.defaultMiddleware(), (req, res) => {
	// 	console.log(res.locals.telegram_user) //null if not from telegram, contains login data otherwise;
	// });

	app.post('/post-login', urlencodeParser, async function (req, res) {

		const {firstName, lastName, telegramId, username} = req.body;

		let users = await StudentModel.find({telegramId: telegramId});

		if (users.length > 0) {
			sess = req.session;
			sess.user = users[0];

			res.redirect('/');
		} else {
			let user = new StudentModel({
				firstName,
				lastName,
				telegramId,
				username
			});
			user = await user.save();

			sess = req.session;
			sess.user = user;

			res.redirect('/');
		}
	});


	app.get('/logout', function (req, res) {

		// Assign  null value in session
		sess = req.session;
		sess.user = null;

		res.redirect('/login');
	});


};
