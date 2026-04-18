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
  BatchWriteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const app = express();
const { randomUUID } = require("node:crypto");

const allowedOrigins = ["http://localhost:8081", "http://127.0.0.1:8081"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS. Origin was:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new DynamoDBClient({
  region: "ap-south-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// console.log(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY);

const docClient = DynamoDBDocumentClient.from(client);

app.get("/", async (req, res, next) => {
  // res.json({ message: "hellooo worllldd!!" });

  res.send("hello, server working correctly!");
});

app.get("/list", async (req, res, next) => {
  const command = new ScanCommand({
    TableName: "Users",
  });

  try {
    const response = await client.send(command);
    console.log(response.Items);
    res.status(200).json({
      items: response.Items,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.post("/user/add", async (req, res, next) => {
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

  try {
    const response = await docClient.send(command);
    if (response?.$metadata.httpStatusCode == 200) {
      res.status(200).json({
        message: "User created successfully!",
      });
    }
    console.log(response);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.post("/messages", async (req, res, next) => {
  const { messages } = req.body;
  console.log(messages);

  let messageArray = [];

  messages.forEach((item) => {
    messageArray.push({
      PutRequest: {
        Item: {
          id: randomUUID(),
          sender: item.sender,
          receiver: item.receiver,
          message: item.message,
          conversationId: item.conversationId,
          timestamp: item.timestamp,
        },
      },
    });
  });

  console.log(JSON.stringify(messageArray));

  const command = new BatchWriteCommand({
    RequestItems: {
      Messages: messageArray,
    },
  });

  try {
    const response = await docClient.send(command);

    if (response.$metadata.httpStatusCode == 200) {
      res.status(200).json({
        message: "messages saved successfully",
      });
    }
    console.log(response);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  console.log(username, password);

  const command = new ScanCommand({
    TableName: "Users",
    FilterExpression: "username = :u",
    ExpressionAttributeValues: {
      ":u": username,
    },
  });
  let storedUser;

  try {
    const response = await docClient.send(command);
    console.log(response);
    storedUser = response.Items[0];
  } catch (err) {
    console.log(err);
    next(err);
  }

  if (!storedUser) {
    return res.status(400).json({
      message: "Username not found",
    });
  }

  let result = await bcrypt.compare(password, storedUser.password);

  // console.log(result, response.Items[0]);

  if (result) {
    res.status(200).json({
      message: "Login Successful",
    });
  } else {
    res.status(401).json({
      message: "Wrong password",
    });
  }
});

app.get("/all_messages", async (req, res, next) => {
  const { receiver, sender } = req.query;
  console.log(receiver, sender);
  const conversationId = [receiver, sender].sort().join("-");
  // const command = new QueryCommand({
  //   TableName: "Messages",
  //   IndexName: "sender_index",
  //   KeyConditionExpression: "sender = :s AND receiver = :r",

  //   ExpressionAttributeValues: {
  //     ":r": receiver,
  //     ":s": sender,
  //   },
  //   // ExpressionAttributeNames: {
  //   //   "#ts": "timestamp",
  //   // },
  // });

  const command = new QueryCommand({
    TableName: "Messages",
    IndexName: "conversationId-index",
    KeyConditionExpression: "conversationId = :c",

    ExpressionAttributeValues: {
      ":c": conversationId,
    },
    // ExpressionAttributeNames: {
    //   "#ts": "timestamp",
    // },
  });

  try {
    const response = await docClient.send(command);
    const sorted = response.Items.sort(
      (a, b) => Number(a.timestamp) - Number(b.timestamp),
    );

    console.log(response.timestamp);

    res.status(200).json({
      messages: sorted,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({
    message: "Internal Server Error" + err,
  });
});

const PORT = 3000;

app.listen(PORT, () => console.log("Express server is listening on 3000"));
