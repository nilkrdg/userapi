const express = require('express');
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
 flash = require('connect-flash');


const db = mongoose.connect('mongodb://localhost/userAPI');
const User = require('./models/userModel');
const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//to show messages after redirect
app.use(flash());

app.use(session({ secret: 'example' }));

//set view engine pug and its source folder
app.set('views', './views');
app.set('view engine', 'pug');

let userRouter = express.Router();


// middleware to use for all requests
userRouter.use((req, res, next) => {
    //logging
    console.log('method '+ req.method);
    console.log('originalUrl '+req.originalUrl);
    console.log('params '+req.params);
    console.log('query '+req.query);
    next(); // go to the next routes
});

userRouter.route('/users')
    .post((req, res) => {
        var user = new User(req.body);
        console.log(user);
        user.save((err, user) => {
            if(err)
            {
                console.log(err);
                res.status(400).send(err.message);
            }
            else{
                res.status(201).send(user);
            }
        });
    })
    .get((req, res) => {

        User.find((err, users) => {
            if(err)
            {
                res.status(500).send(err);
            }else{
                res.json(users);
            }
        });
    });
const SEND_UPDATED_DOC = true;
userRouter.route('/users/:id')
    .get((req, res) => {

        User.findById(req.params.id, (err, user) => {
            if(err)
            {
                console.log(err);
                res.status(500).send(err);
            }else{
                res.json(user);
            }
        });
    })
    .delete((req, res) => {
        User.findByIdAndRemove(req.params.id, (err, user) => {
            if (err){
                return res.status(500).send(err);
            }
            const response = {
                message: "User successfully deleted",
                id: user.id
            };
            return res.status(200).send(response);
        });
    })
    .put((req, res) => {
        User.findByIdAndUpdate(req.params.id, req.body,
            {new: SEND_UPDATED_DOC},
            (err, user) => {
                if (err){
                    return res.status(500).send(err);
                }
                return res.status(200).send(user);
            }
        )
    });



app.use('/api', userRouter);


app.get('/',(req, res) =>
{
    res.render('index', { flash: req.flash() });
});

app.post('/',(req, res) =>
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
                    req.flash('success', 'Authentication successful');
                    //res.redirect('/api/users/'+user.id);

                    res.render('user', { flash: req.flash() });
                }
                else{
                    req.flash('error', 'Username or password is incorrect');
                    res.redirect('/');
                }
            });
        }
    });
});

app.listen(port, () => console.log("gulp is running : listening on port "+port));

