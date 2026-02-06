const express = require('express');
const router = express.Router();

const {addUser,loginUser} = require('../Controller/signupController');

router.post('/',addUser);
router.post('/login',loginUser);

module.exports=router