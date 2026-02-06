const express = require('express');
const router = express.Router();
const validToken = require('../Middleware/jwtValidation');

const {creatGroup,addMemebers,getAllGroupMembers,getAllGroups,deleteGroup} = require('../Controller/GroupsController');



router.post('/',validToken,creatGroup);

router.post('/addmembers',validToken,addMemebers);

router.get('/',validToken,getAllGroups)

router.get('/:groupId',validToken,getAllGroupMembers);

router.delete('/:groupId',validToken,deleteGroup)

module.exports = router;