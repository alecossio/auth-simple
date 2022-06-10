//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const req = require('express/lib/request');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-findorcreate');

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
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
    }); 
  }
));

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

app.get('/logout', (req, res)=>{
    req.logout(()=>{
        res.redirect('/');
    });
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

app.get('/auth/google',
    passport.authenticate('google', { scope: [ 'email', 'profile' ] }));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', { successRedirect: '/secrets', failureRedirect: '/login'} ));

app.listen(3000, ()=>{
    console.log('Server listening on port 3000');
});
