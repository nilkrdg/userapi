const User = require('../models/userModel');
const Image = require('../models/imageModel');
const HttpStatus = require('http-status-codes');
const bcrypt = require('bcrypt');
const config = require('../config');
const jwt = require('jsonwebtoken');
const SEND_UPDATED_DOC = true;
let apiRoutes = require('express').Router();

function verifyToken(req, next)
{
    let response = {};
    let token = req.headers['authorization'];
    if (!token)
    {
        response = {statusCode:  HttpStatus.UNAUTHORIZED, message: 'No token provided.'};
        next(response);
    }
    else {
        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
                if(err.name === 'TokenExpiredError')
                {
                    response = {
                        statusCode:  HttpStatus.UNAUTHORIZED,
                        message: 'Session is expired'
                    };
                }
                else{
                    response = {
                        statusCode:  HttpStatus.INTERNAL_SERVER_ERROR,
                        message: 'Failed to authenticate token.'
                    };
                }
                next(response);
            }
            else{
                response = {statusCode: HttpStatus.OK, decoded: decoded};
                next(null, response);
            }
        });
    }
}

// middleware to use for all requests
apiRoutes.use((req, res, next) => {
    //logging
    console.log('method '+ req.method);
    console.log('originalUrl '+req.originalUrl);
    next(); // go to the next apiRoutes
});

apiRoutes.route('/login')
    .post((req, res) => {
        User.findOne({"username":req.body.username},(err, user) => {
            if(err)
            {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({message: 'Operation failed!'});
            }
            else if(!user)
            {
                return res.status(HttpStatus.NOT_FOUND)
                    .json({message: 'User not found'});

            }else{
                user.comparePassword(req.body.password, (err, isMatched) => {
                    if(isMatched) {
                        // create a token
                        let token = jwt.sign({ id: user._id }, config.secret, {
                            expiresIn: config.tokenTimeToLive
                        });

                        //Authorization is successful, send token
                        return res.status(HttpStatus.OK).json({ token: token , user: user});
                    }
                    else{
                        return res.status(HttpStatus.BAD_REQUEST)
                            .json({message: 'Username or password is incorrect'});
                    }
                });
            }
        });
    });

apiRoutes.route('/users/:id')
    .get((req, res) => {
        verifyToken(req, (err, response) =>{
            if(err)
            {
                return res.status(err.statusCode).json({message: err.message});
            }

            User.findById(req.params.id, (err, user) =>{
                if(err)
                {
                    let response = {
                        message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
                    };
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else if(!user)
                {
                    let response = {
                        message: HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
                    };
                    return res.status(HttpStatus.NOT_FOUND).json(response);
                }
                return res.status(HttpStatus.OK).json(user);
            });
        });
    })
    .delete((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }
            User.findByIdAndRemove(req.params.id, (err, user) => {
                if (err) {
                    let response = {
                        message: 'Delete operation failed.',
                        user: user
                    };
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else if (!user) {
                    let response = {
                        message: "User not found",
                        id: req.params.id
                    };
                    return res.status(HttpStatus.NOT_FOUND).json(response);
                }
                let response = {
                    message: "User successfully deleted",
                    user: user
                };
                return res.status(HttpStatus.OK).json(response);
            });
        });
    })
    .patch(updateUser);

function updateUser(req, res)
{
    verifyToken(req, (err, response) => {
        if (err) {
            return res.status(err.statusCode).json({message: err.message});
        }
        if (req.body.username === "")
            delete req.body.username;
        if (req.body.firstName === "")
            delete req.body.firstName;
        if (req.body.lastName === "")
            delete req.body.lastName;
        if (req.body.email === "")
            delete req.body.email;

        if (req.body.oldPassword && req.body.newPassword === req.body.confirmPassword) {
            req.body.password = req.body.newPassword;
        }
        else if (req.body.oldPassword && req.body.newPassword !== req.body.confirmPassword) {
            let response = {
                message: 'New password and confirm new password don\'t match'
            };
            return res.status(HttpStatus.BAD_REQUEST).json(response);
        }


        if (!req.body.password) {
            findByIdAndUpdate(req, res);
            return;
        }

        //Fetch user document
        User.findById(req.params.id, (err, user) => {
            if (!user) {

                let response = {
                    message: HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
                };
                return res.status(HttpStatus.NOT_FOUND).json(response);
            }
            //compare old password entry with the current password
            user.comparePassword(req.body.oldPassword, (err, isMatched) => {
                if (err) {
                    console.log("updateUser" + err);
                    let response = {
                        message: 'Operation failed!'
                    };
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else if (!isMatched) {
                    let response = {
                        message: 'Password does not match!'
                    };
                    return res.status(HttpStatus.BAD_REQUEST).json(response);
                }
                else {
                    //Password is matched, replace it with the new password before hashing
                    user.password = req.body.newPassword;
                    user.hashPassword((err) => {
                        if (err) {
                            console.log("updateUser" + err);
                            let response = {
                                message: 'Password cannot update!'
                            };
                            return res.status(HttpStatus.BAD_REQUEST).json(response);
                        }
                        else {
                            //replace password with hash
                            req.body.password = user.password;
                            findByIdAndUpdate(req, res);
                        }
                    });
                }
            });
        });
    });
}

function getDuplicateErrorMessage(message)
{
    let property = User.schema.methods.findPropertyInErrorMessage(message);
    if (property !== '' && message.includes('duplicate')) {
        return {message: property + ' must be unique!', property: property};
    }
    return;
}

function getRequiredErrorMessage(message)
{
    let property = User.schema.methods.findPropertyInErrorMessage(message);
    if (property !== '' && message.includes('required')) {
        return {message: property + ' is required!', property: property}
    }
    return;
}

function getErrorMessage(defaultResponse, error, userRequestData)
{
    let message = defaultResponse;

    if(error.name === 'ValidationError')
    {
        let response = {
            message: error.message
        };

        if(userRequestData)
        {
            response.user = userRequestData;
        }

        return response;
    }

    let duplicateErrorMessage = getDuplicateErrorMessage(errorMessage);
    let requiredErrorMessage = getRequiredErrorMessage(errorMessage);

    message = duplicateErrorMessage ? duplicateErrorMessage.message : message;
    message = requiredErrorMessage ? requiredErrorMessage.message : message;
    delete userRequestData[duplicateErrorMessage.property];


    return {
        message: message,
        user: userRequestData
    };
}

function findByIdAndUpdate(req, res)
{
    delete req.body.oldPassword;
    delete req.body.newPassword;
    delete req.body.confirmPassword;
    let userRequestData = req.body;
    User.findByIdAndUpdate(req.params.id, req.body,
        {new: SEND_UPDATED_DOC},
        (err, user) => {
            if (err){
                console.log("updateUser" +err);
                const defaultMessage = 'Update operation failed!';
                let response = getErrorMessage(defaultMessage, err.message, userRequestData);
                if(response.message === defaultMessage)
                {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
                }
                else{
                    return res.status(HttpStatus.BAD_REQUEST).send(response);
                }
            }
            else if(!user)
            {
                let response = {
                    message:  HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
                };
                return res.status(HttpStatus.NOT_FOUND).json(response);
            }
            return res.status(HttpStatus.OK).json(user);
        }
    );
}

apiRoutes.route('/users')
    .post((req, res) => {

        let userRequestData = req.body;
        let user = new User(req.body);
        console.log(user);
        user.save((err, user) => {
            if(err || !user)
            {
                console.log(err);
                const defaultMessage = 'Operation failed!';

                let response = getErrorMessage(defaultMessage, err, userRequestData);
                return res.status(HttpStatus.BAD_REQUEST).json(response);
            }
            else{
                return res.status(HttpStatus.OK).json(user);
            }
        });
    })
    .get((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }

            User.find((err, users) => {
                if (err) {
                    console.log(err);
                    let response = {
                        message: 'User cannot retrieved',
                        id: user.id
                    };
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else {
                    return res.status(HttpStatus.OK).json(users);
                }
            });
        });
    });

apiRoutes.route('/images')
    .post((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }

            // Create an Image instance
            const image = new Image({
                userId: req.body.userId,
                img: req.body.img,
                name: req.body.name
            });

            //Remove previous image
            Image.remove({userId: image.userId}, (err, img) => {
                if(err)
                {
                    let response = {message: 'Image save failed'};
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else {
                    //Save new image as encoded base64
                    image.save((err, img) => {
                        if (err || !img) {
                            console.log(err);
                            let response = {message: 'Image save failed'};
                            return res.status(HttpStatus.BAD_REQUEST).json(response);
                        }
                        else {
                            let response = {
                                message: 'Image save success',
                                id: img._id
                            };
                            return res.status(HttpStatus.OK).json(response);
                        }
                    });
                }
            });
        });
    })
    .get((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }

            //Fetch images from database
            Image.find((err, images) => {
                if (err) {
                    console.log(err);
                    let response = {
                        message: err.message
                    };
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else {
                    return res.status(HttpStatus.OK).json(images);
                }
            });
        });
    });

apiRoutes.route('/images/:id')
    .get((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }

            Image.findById(req.params.id, (err, img) => {
                    if (err){
                        console.log("get image " +err);
                        const response = {message: 'Operation failed!'};
                        return res.status(HttpStatus.BAD_REQUEST).send(response);
                    }
                    else if(!img)
                    {
                        let response = {
                            message:  'Image not found'
                        };
                        return res.status(HttpStatus.NOT_FOUND).json(response);
                    }
                    return res.status(HttpStatus.OK).json(img);
                }
            );
        });
    })
    .delete((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }

            Image.findByIdAndRemove(req.params.id, (err, img) => {
                if (err) {
                    let response = {
                        message: 'Delete operation failed.',
                        img: img._id
                    };
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
                }
                else if (!img) {
                    let response = {
                        message: "Image not found",
                        id: req.params.id
                    };
                    return res.status(HttpStatus.NOT_FOUND).json(response);
                }
                let response = {
                    message: "Image has been successfully deleted",
                    id: img._id
                };
                return res.status(HttpStatus.OK).json(response);
            });

        });
    })
    .patch((req, res) => {
        verifyToken(req, (err, response) => {
            if (err) {
                return res.status(err.statusCode).json({message: err.message});
            }

            Image.findByIdAndUpdate(req.params.id, req.body,
                {new: SEND_UPDATED_DOC},
                (err, img) => {
                    if (err){
                        console.log("update image " +err);
                        const defaultMessage = 'Update operation failed!';
                        let response = getErrorMessage(defaultMessage, err.message);
                        if(response.message === defaultMessage)
                        {
                            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
                        }
                        else{
                            return res.status(HttpStatus.BAD_REQUEST).send(response);
                        }
                    }
                    else if(!img)
                    {
                        let response = {
                            message:  HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
                        };
                        return res.status(HttpStatus.NOT_FOUND).json(response);
                    }
                    return res.status(HttpStatus.OK).json(img);
                }
            );

        });
    });

//All others
apiRoutes.route('*')
    .get((req, res) => {
        let response = {
            message:  HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
        };
        return res.status(HttpStatus.NOT_FOUND).json(response);
    });

module.exports = apiRoutes;