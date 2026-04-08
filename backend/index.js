const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:8081"],
  }),
);

app.get("/", (req, res) => res.json({ message: "hellooo worllldd!!" }));

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
});

const PORT = 3000;

server.listen(PORT, () => console.log(`App is listening on ${PORT}`));
