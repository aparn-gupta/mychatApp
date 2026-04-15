const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8081", // Must match your frontend exactly
    methods: ["GET", "POST"],
    credentials: true,
  },
  credentials: true,
});

const socketIds = {};

io.on("connection", (socket) => {
  console.log("client connected" + socket.id);

  socket.on("register", (user) => {
    socketIds[user] = socket.id;
    console.log("New user registered: " + user + " : " + socket.id);
    console.log("socketIds: " + socketIds);
  });

  socket.on("sendMessage", (data) => {
    const { sender, receiver, userMessage, senderId } = data;
    console.log(sender, receiver, userMessage, senderId);

    const receiversSocket = socketIds[receiver];

    io.to(String(receiversSocket)).emit("receiveMesssage", userMessage);
  });
});

const PORT = 3000;

server.listen(PORT, () => console.log(`App is listening on ${PORT}`));
