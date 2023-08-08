const express = require("express");
const dotenv = require("dotenv");
const { chats } = require("./data/data");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const cors = require("cors");
const path = require("path")


// APP INITIALIZATION
const app = express();
dotenv.config();
connectDB();


// MIDDLEWARE FOR JSON DATA
app.use(express.json());

// NEW MIDDLEWARE
app.use(express.urlencoded({ extended: true }))
app.use(cors());


// API
app.get("/", (req, res) => {
    res.send("API is running");
});

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

// PORTS CONFIG
const PORT = process.env.PORT || 5002;
const server = app.listen(PORT, console.log(`Server started on PORT ${PORT}`));


// SOCKET.IO CONFIG
const io = require("socket.io")(server, {
    pingTimeOut: 60000, // 60 seconds
    cors: {
        origin: "https://talkative.vercel.app/"
    },
});

io.on("connection", (socket) => {
    console.log("connected to socket.io");

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        socket.emit("connected");
    });

    socket.on("typing", (room) => {
        socket.in(room).emit("typing");
    });

    socket.on("stop typing", (room) => {
        socket.in(room).emit("stop typing");
    });

    socket.on("new message", (newMessageRecieved) => {
        let chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach(user => {
            if (user._id === newMessageRecieved.sender._id) return;

            socket.in(user._id).emit("message received", newMessageRecieved);
        });
    });

    socket.off("setup", (room) => {
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
    });
});