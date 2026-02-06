const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const TasksModel = require('./Models/Taskmodel');
const Users = require('./Models/SignupModel');

const http = require('http');
const {Server} = require('socket.io');

const {Dbconnect} = require('./DbConfig/DbConfig')
Dbconnect()

app.use(cors());
app.use(express.json());

app.get('/',(req,res) => {
    res.send("App is running ....")
})

const signupRoute = require('./Routes/SignupRoute');
app.use('/api/signup',signupRoute);

const groupRoute = require('./Routes/GroupRoute');
const { Socket } = require('dgram');
app.use('/api/groups',groupRoute);

const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:['http://localhost:5173'],
        method:['GET','POST']
    }
})

io.use((socket,next) => {
    console.log("secret token verification:",socket.handshake.auth)
    const token = socket.handshake.auth.token;
    if(!token){
        console.log("no token")
        return next(new Error("no token is provided socket middleware"))
    }
    try{
        const decode =  jwt.verify(token,process.env.ACCESS_TOKEN)
        console.log("token verified",decode)
        socket.user = decode.user;
        next();
    }catch(err){
        console.log("token invalid")
        return next(new Error('invalid credidential for socket io'))
    }
})


const onlineUserId = new Map();

io.on('connection',(socket) => {
    
    const UserId = socket.user.id
    onlineUserId.set(UserId,socket.id)
    console.log(onlineUserId)
    console.log(`connected as ${socket.id}`)
    socket.on('task-assigned',async({toUserId,task}) => {
        const targetMember = onlineUserId.get(toUserId)
        console.log(`task is assigned to`,targetMember);
        if(!targetMember){
           console.log("targeted member is disconnected");
           return;
        }
        const newTask = await TasksModel.create({
            task:task,
            from:socket.user.id,
            assignedTo:toUserId,
        });
        await Users.findByIdAndUpdate(toUserId,{status:"BUSY",currentTask:newTask._id})
        io.to(targetMember).emit('task-assigned-to-user',{
                toUserId,
                task:{
                    _id:newTask._id,
                    task:newTask.task,
                    from:{
                        _id:socket.user.id,
                        email:socket.user.email
                    }
                }
            })
        io.emit('task-received',{
            msg:"task assigned"
        });
    });
    socket.on('disconnect',() => {
        onlineUserId.delete(socket.user.id)
        console.log(`disconnected ${socket.id}`)
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT,() => {
    console.log(`Server is running on ${PORT}`)
});