//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();
mongoose.connect('mongodb://' + process.env.DB_HOST + ':'+ process.env.DB_PORT + '/' + process.env.DB_NAME , (err)=>{
    if(err){
        console.log("Error connecting to db:");
        console.log(err);
    }else{
        console.log("DB Connection successful");
    }
})

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:['password']});

const User = mongoose.model('User', userSchema);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res)=>{
    res.render("home");
})

app.get('/login', (req, res)=>{
    res.render("login");
})

app.get('/register', (req, res)=>{
    res.render("register");
})

app.post('/register', (req, res)=>{
    console.log('Entering post register route');
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save((err)=>{
        if(err){
            console.log('Error saving new user:');
            console.log(err);
        }else{
            res.render('secrets');
        }
    })
})

app.post('/login', (req, res)=>{
    console.log('Entering post login route');
    const username = req.body.username;
    const pass = req.body.password;

    User.findOne({email: username}, (err, foundUser)=>{
        console.log(foundUser);
        if(err){
            console.log('Error getting users from db:');
            console.log(err);
        }else{
            if(foundUser){
                if(foundUser.password === pass){
                    res.render('secrets');
                }
            }
        }
    })
})



app.listen(3000, ()=>{
    console.log('Server listening on port 3000');
})
