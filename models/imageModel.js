const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let ImageModel = new Schema(  {
    userId: {
    type: String,
    unique: true,
    required: true,
    },
    img:
    { data: Buffer, type: String },
    name:{
        type: String
    }
});

module.exports = mongoose.model('Image', ImageModel);