const express = require('express');
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    routes = require('./routes/routes'),
    apiRoutes = require('./routes/apiRoutes'),
    methodOverride = require('method-override'),
    config = require('./config'),
    HttpStatus = require('http-status-codes');


mongoose.connect('mongodb://localhost/userAPI');

const app = express();
const port = process.env.PORT || config.port;

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//Set session variable
app.use(session({
    secret: config.secret,
    proxy: true,
    resave: true,
    saveUninitialized: true }));

app.use(express.static(__dirname + '/public' ));

//Set view engine pug and its source folder
app.set('views', './public/views');
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

app.use(function(req, res){
    res.render('error', {message: HttpStatus.NOT_FOUND+' '+HttpStatus.getStatusText(HttpStatus.NOT_FOUND)});
});

app.listen(port, () => console.log("Server is listening on port "+port+" ..."));

