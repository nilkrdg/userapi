let apiRoutes = require('express').Router();
const User = require('../models/userModel');
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
apiRoutes.route('/users/:id')
    .get((req, res) => {
        res.locals.session = req.session;
        res.render('userDetails');
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

module.exports = apiRoutes;