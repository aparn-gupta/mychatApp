const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();

const msgServer = "http://localhost:3000/messages";

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

  socket.on("sendMessage", async (data) => {
    const { sender, receiver, userMessage, senderId } = data;
    console.log(sender, receiver, userMessage, senderId);

    const receiversSocket = socketIds[receiver];

    allMessages.push({
      sender,
      receiver,
      userMessage,
      timestamp: Date.now().toString(),
    });

    if (allMessages.length >= 5) {
      await fetchMessages(allMessages);
      allMessages = [];
    }

    io.to(String(receiversSocket)).emit("receiveMesssage", userMessage);
  });
});

const PORT = 3000;

server.listen(PORT, () => console.log(`App is listening on ${PORT}`));
