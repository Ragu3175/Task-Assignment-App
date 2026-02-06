const mongoose = require("mongoose");

const GroupsScheme = mongoose.Schema({
    groupname:{type: String,required:true},
    createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'Users',required:true},
    members:[{type:mongoose.Schema.Types.ObjectId,ref:'Users'}],
    admins:[{type:mongoose.Schema.Types.ObjectId,ref:'Users'}]
},{timestamps:true})

module.exports = mongoose.model('Groups',GroupsScheme)