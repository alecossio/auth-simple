//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

// ********************************* app config *********************************

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

// initialize session config
app.use(session({
    secret: 'My little secret',
    resave: false,
    saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

// ********************************* Mongoose & Passport.js *********************************

// mongoose connection
mongoose.connect('mongodb://' + process.env.DB_HOST + ':'+ process.env.DB_PORT + '/' + process.env.DB_NAME , (err)=>{
    if(err){
        console.log("Error connecting to db:");
        console.log(err);
    }else{
        console.log("DB Connection successful");
    }
})

// mongoose User Schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
userSchema.plugin(passportLocalMongoose);

// mongoose User model
const User = mongoose.model('User', userSchema);

// passport-local-strategy config
passport.use(User.createStrategy());                //method added by passportLocalMongoose plugin
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ********************************* Routes *********************************

app.get('/', (req, res)=>{
    res.render("home");
})

app.get('/login', (req, res)=>{
    res.render("login");
})

app.get('/register', (req, res)=>{
    res.render("register");
})

app.get('/secrets', (req, res)=>{
    if(req.isAuthenticated()){
        res.render('secrets');
    }else{
        res.redirect("/login");
    }
})

app.post('/register', (req, res)=>{
    User.register({username: req.body.username}, req.body.password, (err)=>{
        if(err){
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            })
        }
    });
     
});

app.post('/login', (req, res)=>{
  
});

app.listen(3000, ()=>{
    console.log('Server listening on port 3000');
})
