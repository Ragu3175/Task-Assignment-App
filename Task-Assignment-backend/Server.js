const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const TasksModel = require('./Models/Taskmodel');
const Users = require('./Models/SignupModel');
const msgUpdate = require('./Models/Msgupdatemodel');
const GroupsModel = require('./Models/groupmodel');

const http = require('http');
const { Server } = require('socket.io');

const { Dbconnect } = require('./DbConfig/DbConfig')
Dbconnect()

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://192.168.1.3:5173',
    ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, ""))
        : [])
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
})

// [MODIFIED] Moved onlineUserId map here to be accessible by middleware
const onlineUserId = new Map();

// [MODIFIED] Middleware to inject io and onlineUserId into the request object
// This allows controllers (like GroupsController) to emit socket events
app.use((req, res, next) => {
    req.io = io;
    req.onlineUserId = onlineUserId;
    next();
});

app.get('/', (req, res) => {
    res.send("App is running ....")
})

const signupRoute = require('./Routes/SignupRoute');
app.use('/api/signup', signupRoute);

const groupRoute = require('./Routes/GroupRoute');
app.use('/api/groups', groupRoute);

io.use((socket, next) => {
    console.log("secret token verification:", socket.handshake.auth)
    const token = socket.handshake.auth.token;
    if (!token) {
        console.log("no token")
        return next(new Error("no token is provided socket middleware"))
    }
    try {
        const decode = jwt.verify(token, process.env.ACCESS_TOKEN)
        console.log("token verified", decode)
        socket.user = decode.user;
        next();
    } catch (err) {
        console.log("token invalid")
        return next(new Error('invalid credidential for socket io'))
    }
})
//


io.on('connection', (socket) => {

    const UserId = socket.user.id
    onlineUserId.set(UserId, socket.id)
    console.log(onlineUserId)
    console.log(`connected as ${socket.id}`)
    socket.on('task-assigned', async ({ groupId, toUserId, task }) => {
        const targetMember = onlineUserId.get(toUserId)
        console.log(`task is assigned to`, targetMember);

        const newTask = await TasksModel.create({
            task: task,
            from: socket.user.id,
            assignedTo: toUserId,
            status: "BUSY"
        });
        await Users.findByIdAndUpdate(toUserId, { status: "BUSY", currentTask: newTask._id })

        const taskData = {
            toUserId,
            groupId,
            task: {
                _id: newTask._id,
                task: newTask.task,
                from: {
                    _id: socket.user.id,
                    email: socket.user.email
                }
            }
        };

        if (targetMember) {
            io.to(targetMember).emit('task-assigned-to-user', taskData);
        } else {
            console.log("targeted member is disconnected");
        }

        // [MODIFIED] Emit to sender as well so their UI updates immediately without refresh
        io.to(socket.id).emit('task-assigned-to-user', taskData);
        const msgfromuser = await Users.findById(UserId);
        const msgtouser = await Users.findById(toUserId);
        const group = await GroupsModel.findById(groupId);
        const updateMsg = `${msgfromuser.username} assigned a task to ${msgtouser.username} - "${newTask.task}" from -${group.groupname}`;
        await msgUpdate.create({ from: UserId, To: toUserId, groupId: groupId, msg: updateMsg });

        io.emit('task-received', {
            msg: updateMsg
        });
    });
    socket.on('disconnect', () => {
        onlineUserId.delete(socket.user.id)
        console.log(`disconnected ${socket.id}`)
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
});