const User = require('../models/userModel');
const HttpStatus = require('http-status-codes');

let apiRoutes = require('express').Router();

// middleware to use for all requests
apiRoutes.use((req, res, next) => {
    //logging
    console.log('method '+ req.method);
    console.log('originalUrl '+req.originalUrl);
    console.log('params '+req.params);
    console.log('query '+req.query);
    next(); // go to the next apiRoutes
});

apiRoutes.route('/users/:id')
    .get((req, res) => {
        User.findById(req.params.id, (err, user) =>{
            if(err)
            {
                let response = {
                    message: "User cannot be retrieved"
                };
                return res.status(400).json(response);
            }
            else if(!user)
            {
                let response = {
                    message: "User not found"
                };
                return res.status(404).json(response);
            }
            return res.status(HttpStatus.OK).json(user);
        });
    })
    .delete((req, res) => {
        User.findByIdAndRemove(req.params.id, (err, user) => {
            if (err){
                let response = {
                    message: 'Delete operation failed.',
                    user: user
                };
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
            }
            else if(!user){
                let response = {
                    message: "User not found",
                    id: req.params.id
                };
                return res.status(400).json(response);
            }
            let response = {
                message: "User successfully deleted",
                user: user
            };
            return res.status(HttpStatus.OK).json(response);
        });
    })
    .patch(updateUser);


//TODO:move into controller
function updateUser(req, res)
{
    if(req.body.username === "")
        delete req.body.username;
    if(req.body.firstName === "")
        delete req.body.firstName;
    if(req.body.lastName === "")
        delete req.body.lastName;
    if(req.body.email === "")
        delete req.body.email;

    if(req.body.oldPassword && req.body.newPassword === req.body.confirmPassword){
        req.body.password = req.body.newPassword;
    }
    else if(req.body.oldPassword && req.body.newPassword !== req.body.confirmPassword)
    {
        let response = {
            message : 'New password and confirm new password don\'t match'
        };
        return res.status(HttpStatus.BAD_REQUEST).json(response);
    }


    if(!req.body.password)
    {
        findByIdAndUpdate(req, res);
        return;
    }

    //Fetch user document
    User.findById(req.params.id, (err, user) =>{

        //compare old password entry with the current password
        user.comparePassword(req.body.oldPassword, (err, isMatched) => {
            if(err) {
                console.log("updateUser" +err);
                let response = {
                    message : 'Operation failed!'
                };
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
            }
            else if(!isMatched)
            {
                let response = {
                    message : 'Password does not match!'
                };
                return res.status(HttpStatus.BAD_REQUEST).json(response);
            }
            else{
                //Password is matched, replace it with the new password before hashing
                user.password = req.body.newPassword;
                user.hashPassword((err) => {
                    if(err)
                    {
                        console.log("updateUser" +err);
                        let response = {
                            message : 'Password cannot update!'
                        };
                        return res.status(HttpStatus.BAD_REQUEST).json(response);
                    }
                    else{
                        //replace password with hash
                        req.body.password = user.password;
                        findByIdAndUpdate(req, res);
                    }
                });
            }
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

function getErrorMessage(defaultResponse, errorMessage, userRequestData)
{
    let message = defaultResponse;

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
    const SEND_UPDATED_DOC = true;
    let userRequestData = req.body;
    User.findByIdAndUpdate(req.params.id, req.body,
        {new: SEND_UPDATED_DOC},
        (err, user) => {
            if (err){
                console.log("updateUser" +err);
                const defaultMessage = 'Update operation failed!';
                let response = getErrorMessage(defaultMessage, err.message, userRequestData);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
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
                let response = getErrorMessage(defaultMessage, err.message, userRequestData);
                return  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
            }
            else{
                return  res.status(HttpStatus.OK).json(user);
            }
        });
    })
    .get((req, res) => {
        User.find((err, users) => {
            if(err)
            {
                console.log(err);
                let response = {
                    message : 'User cannot retrieved',
                    id: user.id
                };
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
            }
            else{
                return res.status(HttpStatus.OK).json(users);
            }
        });
    });

module.exports = apiRoutes;