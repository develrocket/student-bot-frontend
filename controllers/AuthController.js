const express = require('express');
const bodyParser = require('body-parser');
const urlencodeParser = bodyParser.urlencoded({ extended: false });
const StudentModel = require('../models/student');


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
		}
		return res.json({result: "success"});
	});


	app.get('/logout', function (req, res) {

		// Assign  null value in session
		sess = req.session;
		sess.user = null;

		res.redirect('/login');
	});


};
