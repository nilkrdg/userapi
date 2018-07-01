const fs = require('fs');

class Base64Encoder{
    // function to encode file data to base64 encoded string
    static encode(file) {
        // read binary data
        const bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    }

    //function to create file from base64 encoded string
    static decode(base64str, file) {
        //create buffer object from base64 encoded string
        const bitmap = new Buffer(base64str, 'base64');
        //write buffer to file
        fs.writeFileSync(file, bitmap);
        console.log('File created from base64 encoded string');
    }
}

module.exports = Base64Encoder;
