const express = require('express');
const router = express.Router();
const validToken = require('../Middleware/jwtValidation');

const { creatGroup, addMemebers, getAllGroupMembers, getAllGroups, deleteGroup, removeMember, updateStatus, getGroupMessages } = require('../Controller/GroupsController');



router.post('/', validToken, creatGroup);

router.post('/addmembers', validToken, addMemebers);

router.get('/', validToken, getAllGroups)

router.get('/:groupId', validToken, getAllGroupMembers);

router.get('/:groupId/messages', validToken, getGroupMessages);

router.put('/:groupId/:memberId', validToken, updateStatus)

router.delete('/:groupId', validToken, deleteGroup)

router.delete('/:groupId/:memberId', validToken, removeMember)

module.exports = router;