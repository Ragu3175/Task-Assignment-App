const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const TasksModel = require('./Models/Taskmodel');
const Users = require('./Models/SignupModel');

const http = require('http');
const { Server } = require('socket.io');

const { Dbconnect } = require('./DbConfig/DbConfig')
Dbconnect()

// CORS Configuration
// We need to allow requests from your frontend domains (Vercel) to this backend (Render).
// 'origin' specifies which domains are allowed to access this resource.
// 'credentials: true' allows cookies and sessions to be sent.
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://192.168.1.3:5173',
        'https://task-assignment-amz1jsx89-ragu3175s-projects.vercel.app',
        'https://task-assignment-app-delta.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Socket.io needs its own CORS configuration.
        // We must include the same frontend domains here to allow WebSocket connections.
        origin: [
            'http://localhost:5173',
            'http://192.168.1.3:5173',
            'https://task-assignment-amz1jsx89-ragu3175s-projects.vercel.app',
            'https://task-assignment-app-delta.vercel.app'
        ],
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
    socket.on('task-assigned', async ({ toUserId, task }) => {
        const targetMember = onlineUserId.get(toUserId)
        console.log(`task is assigned to`, targetMember);

        const newTask = await TasksModel.create({
            task: task,
            from: socket.user.id,
            assignedTo: toUserId,
        });
        await Users.findByIdAndUpdate(toUserId, { status: "BUSY", currentTask: newTask._id })

        const taskData = {
            toUserId,
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

        io.emit('task-received', {
            msg: "task assigned"
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