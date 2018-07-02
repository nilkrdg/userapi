const User = require('../models/userModel'),
    requestPromise = require('request-promise'),
    HttpStatus = require('http-status-codes'),
    config = require('../config'),
    multer = require('multer'),
    base64Encoder = require('../utils/base64Encoder'),
    fs = require('fs');

//create multer object to save images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage });

//Include router
let routes = require('express').Router();

//Starts session and sets necessary parameters
function startSession(req, res, user, token)
{
    req.session.authenticated = true;
    req.session.user = user;
    req.session.token = token;
    res.locals.session = req.session;
}

//Deletes session and removes saved parameters
function deleteSession(req, res)
{
    req.session.authenticated = false;
    req.session.user = null;
    req.session.token = null;
    res.locals.session = req.session;
}

//Generates http request options object with given parameters
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

//middleware to use for all requests and logs requests
routes.use((req, res, next) => {
    //logging
    console.log('method '+ req.method);
    console.log('originalUrl '+req.originalUrl);
    next(); // go to the next apiRoutes
});

routes.route('/allUsers')
    .get((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {errorStatusCode: HttpStatus.UNAUTHORIZED});
            return;
        }

        let options = getHttpRequestOptions('/api/users', 'GET', null, null, req.session.token);
        requestPromise(options)
            .then(function (response) {
                res.locals.session = req.session;
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
                    res.render('error', {errorStatusCode: HttpStatus.INTERNAL_SERVER_ERROR});
            });
    });

routes.route('/')
    .get((req, res) =>
    {
        if(!req.session.authenticated)
            res.render('login');
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
        requestPromise(options)
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
        requestPromise(options)
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
            res.render('error', {errorStatusCode: HttpStatus.UNAUTHORIZED});
            return;
        }

        deleteSession(req, res);
        res.redirect('/');
    });

routes.route('/images')
    .post(upload.single('imageupload'), (req, res) => {

        if(req.file)
        {
            //Save image name in local variable to display later
            const imgName = req.file.filename;

            //Encode image to base64 to be able to send in json message
            let encodedImg = base64Encoder.encode(req.file.path);

            //Create request message
            let requestMessage = {
                img:encodedImg,
                userId: req.session.user._id,
                name: imgName
            };

            //Send message to REST api to save the image in database
            let options = getHttpRequestOptions('/api/images', 'POST', null, requestMessage, req.session.token);

            requestPromise(options)
                .then(function (response) {
                    console.log(response);
                    //Save image file name in user collection to display
                    let user = req.session.user;
                    user.profileImg = imgName;
                    User.findOneAndUpdate({_id: user._id}, user, {upsert:true}, function(err, user){
                        if (err){
                            console.log('image save operation failed.');
                        }
                        else {
                            console.log('image name successfully saved');
                        }
                    });

                    //reload page with profile image
                    res.locals.session = req.session;
                    res.render('userDetails', {user: req.session.user, imgName: imgName});
                })
                .catch(function (err) {
                    console.log(err);
                    let message = 'Image upload failed!';
                    res.locals.session = req.session;
                    res.render('userDetails', {user: req.session.user, message: message});
                });
        }
    })
    .get((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {errorStatusCode: HttpStatus.UNAUTHORIZED});
            return;
        }
        let options = getHttpRequestOptions('/api/images', 'GET', null, null, req.session.token);
        requestPromise(options)
            .then(function (images) {
                res.locals.session = req.session;

                for(let i=0;i<images.length;i++) {
                    if(images[i])
                    base64Encoder.decode(images[i].img, images[i].name);
                }

                //Read incoming directory
                fs.readdir('public/incoming', function(err, files){
                    if(files)
                    res.render('images', {images: files});
                });

            })
            .catch(function (err) {
                console.log(err);
                if(err.statusCode === HttpStatus.UNAUTHORIZED)
                {
                    deleteSession(req, res);
                    res.redirect('/');
                }
                else
                    res.render('error', {errorStatusCode: HttpStatus.INTERNAL_SERVER_ERROR});
            });
    });

routes.route('/user/:id')
    .get((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {errorStatusCode: HttpStatus.UNAUTHORIZED});
            return;
        }
        res.locals.session = req.session;
        res.render('userDetails', {user: req.session.user, imgName: req.session.user.profileImg});
    })
    .post((req, res) => {
        if(!req.session.authenticated)
        {
            res.render('error', {errorStatusCode: HttpStatus.UNAUTHORIZED});
            return;
        }
        let options = getHttpRequestOptions('/api/users', 'PATCH', req.body.id, req.body, req.session.token);
        requestPromise(options)
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
            res.render('error', {errorStatusCode: HttpStatus.UNAUTHORIZED});
            return;
        }

        let options = getHttpRequestOptions('/api/users', 'DELETE', req.session.user._id, null, req.session.token);
        requestPromise(options)
            .then(function () {
                deleteSession(req, res);
                res.redirect('/');
            })
            .catch(function (err) {
                console.log(err);
                res.render('error', {errorStatusCode: err.statusCode});
            });
    });

//All others
routes.route('*')
    .get((req, res) => {

        res.render('error', {errorStatusCode: HttpStatus.NOT_FOUND});
    });

module.exports = routes;