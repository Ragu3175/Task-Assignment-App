const mongoose = require("mongoose");

const TaskSchema = mongoose.Schema({
    task:{type:String,required:true},
    from:{type:mongoose.Schema.Types.ObjectId,ref:'Users',required:true},
    assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'Users',required:true},
    status:{type:String,enum:["PENDING","DONE"],default:"PENDING"}
},{timestamps:true});

module.exports = mongoose.model("Task",TaskSchema)