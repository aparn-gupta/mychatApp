const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const app = express();

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

console.log(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY);

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

  const { id, username } = req.body;

  const command = new PutCommand({
    TableName: "Users",
    Item: {
      id: id,
      username: username,
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

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8081"],
  },
  credentials: true,
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("client connected" + socket.id);

  socket.on("sendMessage", (data) => {
    const { sender, receiver, userMessage, senderId } = data;
    console.log(sender, receiver, userMessage, senderId);

    io.to(String(senderId)).emit(
      "receiveMesssage",
      "Hello there!!!, I am replying",
    );
  });
});

const PORT = 3000;

server.listen(PORT, () => console.log(`App is listening on ${PORT}`));
app.listen(3001, () => console.log("Express server is listening on 3001"));
