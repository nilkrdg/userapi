const User = require('../models/userModel');
const rp = require('request-promise');
const HttpStatus = require('http-status-codes');
const config = require('../config');

let routes = require('express').Router();

function startSession(req, res, user, token)
{
    req.session.authenticated = true;
    req.session.user = user;
    req.session.token = token;
    res.locals.session = req.session;
}

function deleteSession(req, res)
{
    req.session.authenticated = false;
    req.session.user = null;
    req.session.token = null;
    res.locals.session = req.session;
}

function getHttpRequestOptions(url, method, parameter, body, token)
{
    let options =  {
        uri: 'http://'+config.host+':'+config.port+url,
        method: method,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
    };
    if(body)
        options.body = body;
    if(parameter)
        options.uri += '/'+parameter;
    if(token)
        options.headers['Authorization'] = token;
    return options;
}

// middleware to use for all requests
routes.use((req, res, next) => {
    //logging
    console.log('method '+ req.method);
    console.log('originalUrl '+req.originalUrl);
    console.log('params '+req.params);
    console.log('query '+req.query);
    next(); // go to the next apiRoutes
});

routes.route('/allUsers')
    .get((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+
            HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }

        let options = getHttpRequestOptions('/api/users', 'GET', null, null, req.session.token);
        rp(options)
            .then(function (response) {
                res.render('allUsers', {users: response});

            })
            .catch(function (err) {
                console.log(err);
                if(err.statusCode === HttpStatus.UNAUTHORIZED)
                {
                    deleteSession(req, res);
                    res.redirect('/');
                }
                else
                res.render('error', {message :  HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)});
            });
    });

routes.route('/')
    .get((req, res) =>
    {
        if(!req.session.authenticated)
            res.render('login', { username: '' });
        else
        {
            res.locals.session = req.session;
            res.render('welcome');
        }
    })
    .post((req, res) =>
    {
        if(!req.body.username)
        {
            return res.render('login', {message: 'Username field is empty!'});
        }

        if(!req.body.password)
        {
            return res.render('login', {message: 'Password field is empty!', username: req.body.username});
        }

        let options = getHttpRequestOptions('/api/login', 'POST', null, req.body, null);
        rp(options)
            .then(function (response) {
                //Start new session
                startSession(req, res, response.user, response.token);
                 res.render('welcome');
            })
            .catch(function (err) {
                console.log(err);
                let message = 'Operation failed!';
                if(err.error && err.error.message)
                {
                    message = err.error.message;
                }
                 res.render('login', {message: message});
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
            res.render('signup', {message: 'Password does not match!', user: req.body});
            return;
        }

        let options = getHttpRequestOptions('/api/users', 'POST', null, req.body, req.session.token);
        rp(options)
            .then(function () {
                //Redirect to main page for login
                res.redirect('/');
            })
            .catch(function (err) {
                console.log(err);
                let user = Object.assign(err.error.user);//copy valid user fields
                let message = 'Operation failed!';
                if(err.error && err.error.message)
                {
                    message = err.error.message;
                }
                res.render('signup', {message: message, user:user});
            });
    });

routes.route('/signout')
    .get((req, res) =>
    {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+
            HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }

        deleteSession(req, res);
        res.redirect('/');
    });

routes.route('/user/:id')
    .get((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+
            HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }
        res.locals.session = req.session;
        res.render('userDetails', {user: req.session.user});
    })
    .post((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+
            HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }

        let options = getHttpRequestOptions('/api/users', 'PATCH', req.body.id, req.body, req.session.token);
        rp(options)
            .then(function (user) {
                req.session.user = user;
                res.locals.session = req.session;
                res.render('welcome', {users: user});
            })
            .catch(function (err) {
                console.log(err);
                let message = 'Operation failed!';
                if(err.error && err.error.message)
                {
                    message = err.error.message;
                }
                res.render('userDetails', {user: req.session.user, message: message});
            });
    })
    .delete((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {message: HttpStatus.UNAUTHORIZED+' '+
            HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)});
            return;
        }

        let options = getHttpRequestOptions('/api/users', 'DELETE', req.session.user._id, null, req.session.token);
        rp(options)
            .then(function () {
                deleteSession(req, res);
                res.redirect('/');
            })
            .catch(function (err) {
                console.log(err);
                let message = 'Operation failed!';
                if(err.error && err.error.message)
                {
                    message = err.error.message;
                }
                res.render('error', {message: message});
            });
    });

module.exports = routes;