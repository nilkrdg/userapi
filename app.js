const express = require('express');
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    flash = require('connect-flash'),
    routes = require('./lib/routes'),
    apiRoutes = require('./lib/apiRoutes'),
    methodOverride = require('method-override');

const db = mongoose.connect('mongodb://localhost/userAPI');

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//To show messages after redirect
app.use(flash());

app.use(session({ secret: 'example' }));

//Set view engine pug and its source folder
app.set('views', './views');
app.set('view engine', 'pug');


app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method;
        delete req.body._method;
        return method
    }
}));

//Connect routes starting with api
app.use('/api', apiRoutes);

//Connect all other routes
app.use('/', routes);

app.listen(port, () => console.log("gulp is running : listening on port "+port));

