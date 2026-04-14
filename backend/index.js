const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
dotenv.config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const app = express();
const { randomUUID } = require("node:crypto");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:8081"],
  }),
);

const client = new DynamoDBClient({
  region: "ap-south-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// console.log(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY);

const docClient = DynamoDBDocumentClient.from(client);

app.get("/", async (req, res) => {
  // res.json({ message: "hellooo worllldd!!" });
  const command = new GetCommand({
    TableName: "Users",
    Key: { id: 1 },
  });
  const response = await docClient.send(command);
  console.log(response.Item);
});

app.get("/list", async (req, res) => {
  const command = new ScanCommand({
    TableName: "Users",
  });

  const response = await client.send(command);
  console.log(response.Items);
  res.status(200).json({
    items: response.Items,
  });
});

app.post("/user/add", async (req, res) => {
  console.log(req.body);

  const { username, password, email } = req.body;

  // console.log(randomUUID());

  const hashedPassword = await bcrypt.hash(password, 12);
  const id = randomUUID();
  console.log(hashedPassword);

  const command = new PutCommand({
    TableName: "Users",
    Item: {
      id,
      username,
      password: hashedPassword,
      email,
    },
  });
  const response = await docClient.send(command);
  if (response?.$metadata.httpStatusCode == 200) {
    res.status(200).json({
      message: "User created successfully!",
    });
  }
  console.log(response);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // console.log(id);

  const command = new ScanCommand({
    TableName: "Users",
    FilterExpression: "username = :u",
    ExpressionAttributeValues: {
      ":u": username,
    },
  });

  const response = await docClient.send(command);

  let storedUser = response.Items[0];

  if (!storedUser) {
    res.status(400).json({
      message: "Username not found",
    });
  }

  let result = await bcrypt.compare(password, storedUser.password);

  console.log(result, response.Items[0]);

  if (result) {
    res.status(200).json({
      message: "Login Successful",
    });
  } else {
    res.status(401).json({
      message: "Login failed",
    });
  }
});

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8081"],
  },
  credentials: true,
});

app.set("io", io);

const socketIds = {};

io.on("connection", (socket) => {
  console.log("client connected" + socket.id);

  socket.on("register", (data) => {});

  socket.on("register", (user) => {
    socketIds[user] = socket.id;
    console.log("New user registered: " + user + " : " + socket.id);
    console.log(socketIds);
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
app.listen(3001, () => console.log("Express server is listening on 3001"));
