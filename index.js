var express = require("express");
var app = express();

var http = require("http");
var server = http.Server(app);

var io = require("socket.io")(server);

socketIdList = {};

io.on("connection", client => {
  // console.log("connected " + client.id);

  client.on("initiate", data => {
    socketIdList[data.userName] = client.id;
  });

  client.on("leaveRoom", data => {
    client.leave(data.roomId);
    io.in(data.roomId).emit("leaveRoom");
    io.in(data.roomId).clients((err, clients) => {
      clients.forEach(client => {
        io.sockets.sockets[client].leave(data.roomId);
      });
    });
  });

  // client.on("disconnect", data => {
  //   delete socketIdList[data.userName];
  //   console.log("disconnected");
  // });

  client.on("updateBoard", data => {
    io.in(data.roomId).emit("updateBoard", {
      cellNo: data.cellNo
    });
  });

  client.on("sendInvite", data => {
    client.emit("symbolAssigned", { symbol: "X" });

    roomId = "room-" + data.from + "-" + data.to;
    client.join(roomId);

    if (socketIdList[data.to]) {
      io.to(socketIdList[data.to]).emit("invite", {
        from: data.from,
        roomId: roomId
      });
      client.emit("acknowledgement", { message: "Invitation sent", error: 0 });
    } else {
      client.emit("acknowledgement", {
        message: "Username doesn't exist.",
        error: 1
      });
    }
  });

  client.on("accept", data => {
    client.emit("symbolAssigned", { symbol: "O" });

    client.join(data.roomId);

    io.in(data.roomId).emit("inviteResponse", {
      status: "accepted",
      roomId: data.roomId
    });
  });

  client.on("decline", data => {
    io.in(data.roomId).emit("inviteResponse", {
      status: "declined",
      message: "Invite declined."
    });
  });
});

var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var utils = require("./utils");

var users = [
  { userName: "a", password: "a" },
  { userName: "b", password: "b" }
];

var currentUser = "";

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

function isLoggedIn(req, res, next) {
  if (req.headers.authorization) {
    let result = utils.verifyToken(req.headers.authorization);

    if (result) {
      currentUser = result.userName;
      next();
    } else res.status(401).json({ error: "invalid token" });
  } else res.status(401).json({ error: "token not found" });
}

app.get("/", isLoggedIn, function(req, res) {
  res.status(200).send(currentUser);
});

app.post("/signUp", (req, res) => {
  let record = users.find(user => {
    return user.userName === req.body.userName;
  });

  if (record) {
    res.json({
      token: "",
      error: 1,
      message: "Username already exists."
    });
  } else {
    users.push(req.body);

    console.log(users);

    var details = {
      userName: req.body.userName
    };

    let token = utils.generateToken(details);

    res
      .status(201)
      .json({ token: token, error: 0, message: "Account created." });
  }
});

app.post("/login", (req, res) => {
  let record = users.find(user => {
    return (
      user.userName === req.body.userName && user.password === req.body.password
    );
  });

  if (record) {
    var details = {
      userName: record.userName
    };

    console.log(details.userName + " logged in");

    let token = utils.generateToken(details);

    res
      .status(200)
      .json({ token: token, error: 0, message: "Login successful" });
  } else {
    res.json({ token: "", error: 1, message: "Invalid Credentials" });
  }
});

// For checking current data

app.get("/users", function(req, res) {
  res.status(200).send(users);
});

server.listen(5000);
