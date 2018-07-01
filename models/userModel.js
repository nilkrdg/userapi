const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = require('../config').salt;


let UserModel = new Schema({
    username:{
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        validate: [validateEmail, 'Email is not valid!']
    },
    password:{
        type:String,
        required: true,
        validate: [validatePassword, 'Password is not valid! Please make sure ' +
        'your password has minimum eight characters,' +
        ' at least one letter and one number.']
    },
    profileImg: {
        type: String
    },
});

function validateEmail(email) {
    let re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

function validatePassword(password){
    let re = /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{8,})/;
    return re.test(password);
}

UserModel.pre('save', function(next) {
    let user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    user.hashPassword(next);
});

UserModel.methods.hashPassword = function(next)
{
    let user = this;
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
};

UserModel.methods.comparePassword = function(password, callback) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
        if (err) return callback(err);
        callback(null, isMatch);
    });
};

UserModel.methods.findPropertyInErrorMessage = function(errorMessage){
    let keys = Object.keys(UserModel.obj);
    for(let i=0;i<keys.length;i++)
    {
        if(errorMessage.includes(keys[i]))
        {
            return keys[i];
        }
    }
    return '';
};

module.exports = mongoose.model('User', UserModel);