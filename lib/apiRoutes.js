const User = require('../models/userModel');
const SEND_UPDATED_DOC = true;

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
        res.render('userDetails', {user: req.session.user});
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
    .patch(updateUser);


//TODO:move into controller
function updateUser(req, res)
{
    let isValid = true;
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



    if(!req.body.password)
    {
        findByIdAndUpdate(req, res);
        return;
    }

    //convert json to mongoose model object
    let user = new User(req.session.user);

    //compare old password entry with the current password
    user.comparePassword(req.body.oldPassword, (err, isMatched) => {
        if(!isMatched || err) {
            console.log("updateUser" +err);
            req.flash('error', err);
            res.render('userDetails', { flash: req.flash() , user: req.session.user});
        }
        else{
            //Password is matched, replace it with the new password before hashing
            user.password = req.body.newPassword;
            user.hashPassword((err) => {
                if(err)
                {
                    console.log("updateUser" +err);
                    req.flash('error', err);
                    res.locals.session = req.session;
                    res.render('userDetails', { flash: req.flash() });
                }
                else{
                    //replace password with hash
                    req.body.password = user.password;
                    findByIdAndUpdate(req, res);
                }
            });
        }
    });

}
function findByIdAndUpdate(req, res)
{

    delete req.body.oldPassword;
    delete req.body.newPassword;
    delete req.body.confirmPassword;

    User.findByIdAndUpdate(req.params.id, req.body,
        {new: SEND_UPDATED_DOC},
        (err, user) => {
            if (err){
                console.log("updateUser" +err);
                req.flash('error', err);
                res.render('userDetails', { flash: req.flash() });
            }
            //Update session variable
            req.session.user = user;
            res.locals.session = req.session;
            //Navigate to user details
            req.flash('success', 'Your profile has been updated successfully.');
            res.render('welcome', { flash: req.flash() });
        }
    );
}


apiRoutes.route('/users')
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
                res.status(202).send(user);
            }
        });
    })
    .get((req, res) => {

        User.find((err, users) => {
            if(err)
            {
                res.status(500).send(err);
            }else{
                res.render('userList', {users: users});
            }
        });
    });



module.exports = apiRoutes;