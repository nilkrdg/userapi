const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let ImageModel = new Schema(  {
    userId: {
    type: String,
    unique: true,
    required: true,
    },
    img:
    {
        data: Buffer,
        type: String,
        validate: [validateImage, 'Image data is not valid!']
    },
    name:{
        type: String
    }
});

//Check if the image data in base64
function validateImage(email) {
    let re = /[A-Za-z0-9+/=]/; //should have only base64 chars
    return re.test(email);
};

module.exports = mongoose.model('Image', ImageModel);