const User = require('../Models/SignupModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const addUser = async(req,res) => {
    try{
        const {username,email,password} = req.body;
        const existingUser = await User.findOne({email});
        if(existingUser){
           return res.status(409).json({message:"the email is already exists"});
        }
        const hashedPassword = await bcrypt.hash(password,10);
        await User.create({
            username,
            email,
            password:hashedPassword
        })
        res.status(201).json({message:"User created succesfully"})
    }catch(err){
        console.error("server side error while adding user",err)
        res.status(500).json({error:err.message})
    }
}

const loginUser = async(req,res) => {
    try{
        const {email,password} = req.body;
        const existingUser = await User.findOne({email});
        if(!existingUser){
            return res.status(404).json({message:"the email is not exist"});
        }
        const isValidPassword = await bcrypt.compare(password,existingUser.password);
        if(!isValidPassword){
            return res.status(403).json({message:"password is incorrect"})
        }
        const accessToken = await jwt.sign({
            user:{
                id:existingUser._id,
                username:existingUser.username,
                email:existingUser.email,
                // password:existingUser.password
            }
        },process.env.ACCESS_TOKEN,{expiresIn: '1h'});
        res.status(201).json({message:"Login succesfull",accessToken})
    }catch(err){
        console.error("server side error while login",err);
        res.status(500).json({error:err.message})
    }
}

module.exports = {addUser,loginUser}