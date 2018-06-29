const User = require('../models/userModel');

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

routes.route('/')
    .get((req, res) =>
{
    res.render('login', { flash: req.flash() });
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
        res.render('signup');
    })
    .post((req, res) =>
    {
        var user = new User(req.body);
        console.log(user);
        user.save((err, user) => {
            if(err)
            {
                console.log(err);
                req.flash('error', err);
                res.redirect('/signup', { flash: req.flash() });
            }
            else{
                req.session.authenticated = true;
                req.session.user = user;
                res.locals.session = req.session;
                res.render('welcome');
            }
        });
    });

module.exports = routes;