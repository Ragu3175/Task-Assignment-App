const { populate } = require('dotenv');
const User = require('../Models/SignupModel');
const Group = require('../Models/groupmodel');

const creatGroup = async(req,res) => {
    try{
        const {groupname} = req.body;
        const currentUser = await User.findOne({email:req.user.email});
        if(!currentUser){
            return res.status(402).json({message:"cannot find the User"});
        }
        const  group = await Group.create({
            groupname,
            createdBy:currentUser._id,
            members:[currentUser._id],
            admins:[currentUser._id]
        });
        await currentUser.teams.push(group._id);
        await currentUser.save();
        res.status(201).json({messgae:"group created succesfulley",group})
    }catch(err){
        res.status(500).json({message:"server erro while creat a group"})
        console.error("server error creating a group",err)
    }
}
const addMemebers = async(req,res) => {
    try{
        const {groupId,memberEmail} = req.body;
        console.log(groupId,memberEmail)
        const currentUser = await User.findOne({email:req.user.email});
        if(!currentUser){
            return res.status(402).json({message:"user is invalid"});
        }
        const group = await Group.findById(groupId);
        const memberinDb = await User.findOne({email:memberEmail});
        if(!group){
            return res.status(404).json({message:"cannot find the group"});
        } 
        if(!memberinDb){
            return res.status(404).json({message:"cannot find the user in DB"});
        }
        const isAdmin = await group.admins.some( id => id.toString() === currentUser._id.toString())
        if(!isAdmin){
            return res.status(403).json({message:"only admin can add members"});
        }
        const alreadyMember = await group.members.some(id => id.toString() === memberinDb._id.toString())
        if(alreadyMember){
            return res.status(409).json({message:"the member already in the group"});
        }
        group.members.push(memberinDb._id);
        memberinDb.teams.push(group._id);

        await group.save();
        await memberinDb.save();
        res.status(201).json({message:"member added succesfully"});
    }catch(err){
        res.status(500).json({message:"server error in teamadding controller",err});
        console.error("server error",err.message)
    }
}

const getAllGroupMembers = async(req,res) => {
    try{
        const {groupId} = req.params;
        const group = await Group.findById(groupId).populate({
            path:'members',
            select:'username email status currentTask',
            populate:{
                path:'currentTask',
                select:'task from',
                populate:{
                    path:'from',
                    select:'email username'
                }
            }
        });
        if(!group){
            return res.status(404).json({message:"cannot find the group"});
        }
        res.status(200).json({groupId:group._id,members:group.members})
    }catch(err){
        res.status(500).json({message:"server error in get all team members"});
        console.error("server error get all users",err)
    }
}

const getAllGroups = async(req,res) => {
    try{
        const currentUser = await User.findOne({email:req.user.email}).populate('teams');
        if(!currentUser) {
            return res.status(404).json({message:"unauthorized access for get all groups"})
        }
        res.status(200).json({message:"fetching all groups succcesfully ",groups:currentUser.teams})
    }catch(err){
        res.status(500).json({message:"server error while get all groups"})
        console.error("server error while get all groups",err)
    }
}

const deleteGroup = async(req,res) => {
    try{
        const {groupId} = req.params;
        const currentUser = await User.findOne({email:req.user.email});
        if(!currentUser){
            return res.status(404).json({message:"cannot fing the current User"})
        }
        const group = await Group.findById(groupId);
        if(!group){
            return res.status(404).json({message:"cannot find group"})
        }
        const isAdmin = await group.admins.some(id => id.toString() === currentUser._id.toString());
        if(!isAdmin){
            return res.status(403).json({mesage:"only admin can delete the groups"})
        }
        await User.updateMany(
            {_id:{$in:group.members}},
            {$pull:{teams:group._id}}
        )
        await Group.findByIdAndDelete(groupId)
        res.status(200).json({message:"Group deleted succesfully"})
    }catch(err){
        res.status(500).json({message:"server error in delete controller"});
        console.error("server error in delete controller",err)
    }
}



module.exports = {creatGroup,addMemebers,getAllGroupMembers,getAllGroups,deleteGroup}