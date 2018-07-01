module.exports = {
    'port':8080,
    'host':'localhost',
    'secret': 'mysecret',
    'tokenTimeToLive': 60, //expires in 24 hours
    'salt': 10 //static salt value for hashing password
    // Single salt value is used for simplicity, security might be enhanced by using different salt for each user
};
