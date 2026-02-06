const mongoose = require("mongoose");


const UsersSchema =  mongoose.Schema({
    username:{type:String,required: true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    teams:[{type:mongoose.Schema.Types.ObjectId,ref:'Groups'}],
    status:{type:String,enum:["FREE","BUSY"],default:"FREE"},
    currentTask:{type:mongoose.Schema.Types.ObjectId,ref:"Task"}
},{
    timestamps:true
})

module.exports = mongoose.model('Users',UsersSchema);