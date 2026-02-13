const { populate } = require('dotenv');
const User = require('../Models/SignupModel');
const Group = require('../Models/groupmodel');

const creatGroup = async (req, res) => {
    try {
        const { groupname } = req.body;
        const currentUser = await User.findOne({ email: req.user.email });
        if (!currentUser) {
            return res.status(402).json({ message: "cannot find the User" });
        }
        const group = await Group.create({
            groupname,
            createdBy: currentUser._id,
            members: [currentUser._id],
            admins: [currentUser._id]
        });
        await currentUser.teams.push(group._id);
        await currentUser.save();
        res.status(201).json({ messgae: "group created succesfulley", group })
    } catch (err) {
        res.status(500).json({ message: "server erro while creat a group" })
        console.error("server error creating a group", err)
    }
}
const addMemebers = async (req, res) => {
    try {
        const { groupId, memberEmail } = req.body;
        console.log(groupId, memberEmail)
        const currentUser = await User.findOne({ email: req.user.email });
        if (!currentUser) {
            return res.status(402).json({ message: "user is invalid" });
        }
        const group = await Group.findById(groupId);
        // [MODIFIED] Populate currentTask and from details immediately
        const memberinDb = await User.findOne({ email: memberEmail }).populate({
            path: 'currentTask',
            select: 'task from',
            populate: {
                path: 'from',
                select: 'email username'
            }
        });
        if (!group) {
            return res.status(404).json({ message: "cannot find the group" });
        }
        if (!memberinDb) {
            return res.status(404).json({ message: "cannot find the user in DB" });
        }
        const isAdmin = await group.admins.some(id => id.toString() === currentUser._id.toString())
        if (!isAdmin) {
            return res.status(403).json({ message: "only admin can add members" });
        }
        const alreadyMember = await group.members.some(id => id.toString() === memberinDb._id.toString())
        if (alreadyMember) {
            return res.status(409).json({ message: "the member already in the group" });
        }
        group.members.push(memberinDb._id);
        memberinDb.teams.push(group._id);

        await group.save();
        await memberinDb.save();

        // [MODIFIED] Notify users via socket.io for real-time updates
        const io = req.io;
        const onlineUserId = req.onlineUserId;

        if (io && onlineUserId) {
            // 1. Notify the new member that they have been added to a group
            // This updates the "GroupInbox" on the new member's side
            const newMemberSocketId = onlineUserId.get(memberinDb._id.toString());
            if (newMemberSocketId) {
                io.to(newMemberSocketId).emit('added-to-group', group);
            }

            // 2. Notify existing group members (including the admin) that a new member has joined
            // This updates the "selectedGroup" member list on the admin's side (and others)
            group.members.forEach(memberId => {
                // Skip the new member (User B) as they receive 'added-to-group'
                if (memberId.toString() === memberinDb._id.toString()) return;

                const socketId = onlineUserId.get(memberId.toString());
                if (socketId) {
                    io.to(socketId).emit('member-added', {
                        groupId: group._id,
                        member: memberinDb
                    });
                }
            });
        }

        res.status(201).json({ message: "member added succesfully" });
    } catch (err) {
        res.status(500).json({ message: "server error in teamadding controller", err });
        console.error("server error", err.message)
    }
}

const getAllGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId).populate({
            path: 'members',
            select: 'username email status currentTask',
            populate: {
                path: 'currentTask',
                select: 'task from',
                populate: {
                    path: 'from',
                    select: 'email username'
                }
            }
        });
        if (!group) {
            return res.status(404).json({ message: "cannot find the group" });
        }
        res.status(200).json({ groupId: group._id, members: group.members })
    } catch (err) {
        res.status(500).json({ message: "server error in get all team members" });
        console.error("server error get all users", err)
    }
}

const getAllGroups = async (req, res) => {
    try {
        const currentUser = await User.findOne({ email: req.user.email }).populate('teams');
        if (!currentUser) {
            return res.status(404).json({ message: "unauthorized access for get all groups" })
        }
        res.status(200).json({ message: "fetching all groups succcesfully ", groups: currentUser.teams })
    } catch (err) {
        res.status(500).json({ message: "server error while get all groups" })
        console.error("server error while get all groups", err)
    }
}

const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUser = await User.findOne({ email: req.user.email });
        if (!currentUser) {
            return res.status(404).json({ message: "cannot fing the current User" })
        }
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "cannot find group" })
        }
        const isAdmin = await group.admins.some(id => id.toString() === currentUser._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ mesage: "only admin can delete the groups" })
        }
        await User.updateMany(
            { _id: { $in: group.members } },
            { $pull: { teams: group._id } }
        )
        await Group.findByIdAndDelete(groupId)
        res.status(200).json({ message: "Group deleted succesfully" })
    } catch (err) {
        res.status(500).json({ message: "server error in delete controller" });
        console.error("server error in delete controller", err)
    }
}

const removeMember = async(req,res) => {
    const {groupId,memberId} = req.params;
    const currenUser = await User.findOne({email:req.body.email});
    const existgroup = await Group.findById(groupId);
    if(!existgroup){
        return res.status(404).json({message:"group is not found"});
    }
    const isAdmin = await existgroup.admins.some(id => id.toString() === currenUser._id.toString());
    if(!isAdmin){
        return res.status(403).json({message:"only admin can remove member"})
    }
    const memberInDb = await User.findById(memberId);
    if(!memberInDb){
        return res.status(404).json({message:"member is not exist"})
    }
    existgroup.members = existgroup.members.filter((id) => id.toString()!==memberId);
    memberInDb.teams = memberInDb.teams.filter((id) => id.toString() !== groupId);
    
    await existgroup.save();
    await memberInDb.save();

    const io = req.io;
    const onlineUserId = req.onlineUserId;

    const removedMemberSocket = onlineUserId.get(memberId)
    if(removedMemberSocket){
        io.to(removedMember).emit('removed-from-team',{groupId});
    }

    existgroup.members.forEach(member => {
        const socketId = onlineUserId.get(member.toString());
        if(socketId){
            io.to(socketId).emit('member-removed-from-team',{
                groupId,memberId
            })
        }
    })
    
    res.status(200).json({message:"member removed succesfully"})
    try{}catch(err){
        res.status(500).json({message:"server error while remove member"});
        console.error("server error while removing member")
    }
}


module.exports = { creatGroup, addMemebers, getAllGroupMembers, getAllGroups, deleteGroup, removeMember}