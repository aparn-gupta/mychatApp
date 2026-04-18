const { Server } = require("socket.io");
const http = require("http");
const axios = require("axios");

const server = http.createServer((req, res) => {
  if (req.url == "/hello") {
    res.end("Hello, socket server is running fine!!");
  }
});

// const msgServer = "http://localhost:3000/messages";

const msgServer =
  "https://mychat-app-aparnas-projects-5f64a891.vercel.app/messages";

const fetchMessages = async (messageList) => {
  try {
    const res = await axios.post(msgServer, {
      messages: messageList,
    });
  } catch (err) {
    console.log(err);
  }
};

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8081", // Must match your frontend exactly
    methods: ["GET", "POST"],
    credentials: true,
  },
  credentials: true,
});

const socketIds = {};

let allMessages = [];

io.on("connection", (socket) => {
  console.log("client connected" + socket.id);

  socket.on("register", (user) => {
    socketIds[user] = socket.id;
    console.log("New user registered: " + user + " : " + socket.id);
    console.log("socketIds: " + socketIds);
  });

  let messageArray;

  socket.on("sendMessage", async (data) => {
    const { sender, receiver, userMessage, timestamp } = data;
    // console.log(sender, receiver, userMessage, senderId);

    const receiversSocket = socketIds[receiver];
    const conversationId = [receiver, sender].sort().join("-");

    allMessages.push({
      sender,
      receiver,
      message: userMessage,
      conversationId,
      // timestamp: Date.now().toString(),
      timestamp,
    });

    io.to(String(receiversSocket)).emit("receiveMesssage", {
      userMessage,
      timestamp,
      sender,
    });

    console.log(allMessages);
    console.log(socketIds);

    if (allMessages.length >= 1) {
      messageArray = allMessages;
      allMessages = [];

      await fetchMessages(messageArray);
    }
  });
});

const PORT = 3002;

server.listen(PORT, () => console.log(`App is listening on ${PORT}`));
