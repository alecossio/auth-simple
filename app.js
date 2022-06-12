//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require('mongoose-findorcreate');
const req = require('express/lib/request');

// ********************************* app config *********************************

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

// initialize session config
app.use(session({
    secret: process.env.SESSION_SECRET,
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
});

// mongoose User Schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    googleId: String,
    facebookId: String,
    language: String,
    secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// mongoose User model
const User = mongoose.model('User', userSchema);

// passport.js strategies
passport.use(User.createStrategy());                                    //passport-local-mongoose
passport.use(new GoogleStrategy({                                       //passport-google-oauth2
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : false
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, { name: profile.displayName, email: profile.email, language: profile.language }, function (err, user) {
        return cb(err, user);
    }); 
  }
));
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/secrets'
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ facebookId: profile.id }, { name: profile.displayName }, function (err, user) {
        return cb(err, user);
    }); 
  }
));

// user serializing for session establishment
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
});
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});


// ********************************* Routes *********************************

app.get('/', (req, res)=>{
    res.render("home");
});
app.get('/login', (req, res)=>{
    res.render("login");
});
app.get('/register', (req, res)=>{
    res.render("register");
});
app.get('/secrets', (req, res)=>{
    User.find({secret:{$ne: null}}, (err, foundUsers)=>{
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render('secrets', {foundUsers: foundUsers});
            }
        }
    })
});
app.get('/logout', (req, res)=>{
    req.logout(()=>{
        res.redirect('/');
    });
});
app.get('/submit', (req, res)=>{
    if(req.isAuthenticated()){
        res.render('submit');
    }else{
        res.redirect("/login");
    }
});
app.post('/login', (req, res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err)=>{
        if(err){
            console.log(err);
            res.redirect('/login');
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            })
        }
    })
});
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
app.post('/submit', (req, res)=>{
    if(req.isAuthenticated()){
        console.log(req.user);
        User.findById(req.user.id, (err, foundUser)=>{
            foundUser.update({secret: req.body.secret}, (err, result)=>{
                if(err){
                    console.log(err);
                }else{
                    console.log("Result: " + result);
                    res.redirect('/secrets');
                }
            })
        });
    }else{
        res.redirect("/login");
    }
})

app.get('/auth/google', passport.authenticate('google', { scope: [ 'email', 'profile' ] }));

app.get( '/auth/google/secrets', passport.authenticate( 'google', { successRedirect: '/secrets', failureRedirect: '/login'} ));

app.get('/auth/facebook', passport.authenticate('facebook', { scope: [ 'email', 'public_profile' ] }));

app.get( '/auth/facebook/secrets', passport.authenticate( 'facebook', { successRedirect: '/secrets', failureRedirect: '/login'} ));

app.listen(3000, ()=>{
    console.log('Server listening on port 3000');
});
