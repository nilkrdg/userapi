const User = require('../models/userModel');
const rp = require('request-promise');
const HttpStatus = require('http-status-codes');

let routes = require('express').Router();

// middleware to use for all requests
routes.use((req, res, next) => {
    //logging
    console.log('method '+ req.method);
    console.log('originalUrl '+req.originalUrl);
    console.log('params '+req.params);
    console.log('query '+req.query);
    next(); // go to the next apiRoutes
});

routes.route('/userList')
    .get((req, res) => {

        let options = {
            uri: 'http://localhost:8080/api/users',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (response) {
                res.render('userList', {users: response});

            })
            .catch(function (err) {
                console.log(err);
                res.render('error');
            });
    });

routes.route('/')
    .get((req, res) =>
    {
        if(!req.session.authenticated)
            res.render('login', { flash: req.flash() });
        else
        {
            res.locals.session = req.session;
            res.render('welcome');
        }
    })
    .post((req, res) =>
    {
        User.findOne({"username":req.body.username},(err, user) => {
            if(err || !user)
            {
                req.flash('error', 'User not found');
                res.redirect('/');

            }else{
                user.comparePassword(req.body.password, (err, isMatched) => {
                    if (err){
                        req.flash('error', 'Username or password is incorrect');
                        res.redirect('/');
                    }
                    if(isMatched) {
                        req.session.authenticated = true;
                        req.session.user = user;
                        res.locals.session = req.session;
                        res.render('welcome');
                    }
                    else{
                        req.flash('error', 'Username or password is incorrect');
                        res.redirect('/');
                    }
                });
            }
        });
    });

routes.route('/signup')
    .get((req, res) =>
    {
        res.render('signup', {user:{}});
    })
    .post((req, res) =>
    {
        let user = new User(req.body);
        if(!req.body.username)
        {
            res.render('signup', {message: 'Username is required!', user: req.body});
            return;
        }
        if(!req.body.firstName)
        {
            res.render('signup', {message: 'First name is required!', user: req.body});
            return;
        }

        if(!req.body.lastName)
        {
            res.render('signup', {message: 'Last name is required!', user: req.body});
            return;
        }

        if(!req.body.email)
        {
            res.render('signup', {message: 'Email is required!', user: req.body});
            return;
        }

        if(!req.body.password)
        {
            res.render('signup', {message: 'Password is required!', user: req.body});
            return;
        }

        if(req.body.password !== req.body.confirmPassword)
        {
            res.render('signup', {message: 'Password does not!', user: req.body});
            return;
        }

        let options = {
            uri: 'http://localhost:8080/api/users',
            method: 'POST',
            body: req.body,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (user) {
                req.session.authenticated = true;
                req.session.user = user;
                res.locals.session = req.session;
                res.render('welcome');
            })
            .catch(function (err) {
                console.log(err);
                let user = Object.assign(err.error.user);//copy valid user fields
                res.render('signup', {message: err.error.message, user:user});
            });
    });
routes.route('/signout')
    .get((req, res) =>
    {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }
        req.session.authenticated = false;
        req.session.user = null;
        res.locals.session = req.session;
        res.redirect('/');
    });

routes.route('/user/:id')
    .get((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }
        res.locals.session = req.session;
        res.render('userDetails', {user: req.session.user});
    })
    .post((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }
        let options = {
            uri: 'http://localhost:8080/api/users/'+req.body.id,
            method: 'PATCH',
            body: req.body,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (user) {
                req.session.user = user;
                res.locals.session = req.session;
                res.render('welcome', {users: user});
            })
            .catch(function (err) {
                console.log(err);
                res.render('userDetails', {message: err.error.message});
            });
    })
    .delete((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }
        let options = {
            uri: 'http://localhost:8080/api/users/'+req.params.id,
            method: 'DELETE',
            body: req.body,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };
        rp(options)
            .then(function () {
                req.session.authenticated = false;
                req.session.user = null;
                res.locals.session = req.session;
                res.redirect('/');
            })
            .catch(function (err) {
                console.log(err);
                res.render('error', {message: err.error.message});
            });
    });

module.exports = routes;