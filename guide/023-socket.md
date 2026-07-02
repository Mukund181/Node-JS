# Real-Time Communication with Socket.io

Socket.io is a library that enables low-latency, bi-directional, and event-based communication between client web browsers and Node.js servers.

---

## 1. Prerequisites & Conceptual Basics

### The WebSocket Protocol
Standard HTTP connections are short-lived: the client makes a request, the server responds, and the connection closes. If the server has new data (e.g. a new chat message), it cannot push it to the client directly; the client must poll the server for updates.

WebSockets solve this by introducing a persistent, bi-directional connection:
1. **Handshake**: The client starts with a standard HTTP request, but includes an `Upgrade: websocket` header.
2. **Upgrade**: The server accepts the upgrade request, establishing a persistent TCP socket connection.
3. **Data Exchange**: Both client and server can send data packets (frames) back and forth instantly at any time, without the overhead of HTTP headers.

Socket.io is a wrapper library built on top of WebSockets that handles connection fallbacks, automatic reconnection attempts, and room partitioning.

---

## 2. Theory & Deep Dive

### Namespaces vs. Rooms
- **Namespaces (`io.of("/chat")`)**: Large communication channels partitioned at the URL level. Sockets connecting to different namespaces are completely isolated.
- **Rooms (`socket.join("general")`)**: Sub-channels within a namespace. Sockets can join or leave rooms dynamically to receive targeted broadcasts (e.g. joining a private chat room).

---

## 3. Code Implementation

First, install the package: `npm install socket.io express`

### Server File: `server.js`
```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const PORT = 3000;

// Create HTTP server instances manually to wrap our Express app
const server = http.createServer(app);

// Bind Socket.io to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust whitelists for production
    methods: ["GET", "POST"]
  }
});
```

---

## 4. Self-Contained Mini-Project: Live Collaborative Chatroom

We will build a server and client interface that supports dynamic chatroom selection.

### Project Setup
```text
express-socket-chat/
├── server.js
├── index.html
└── package.json (requires: express, socket.io)
```

### File: `server.js`
```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // Listen for room join events
  socket.on("join_room", (room) => {
    // Leave previous rooms
    socket.rooms.forEach(r => {
      if (r !== socket.id) socket.leave(r);
    });

    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
    
    // Broadcast notification to the room
    socket.to(room).emit("notification", `User ${socket.id.substring(0, 4)} joined the chat.`);
  });

  // Listen for messages
  socket.on("chat_message", (data) => {
    const { room, message } = data;
    // Broadcast message to everyone in the room
    io.to(room).emit("new_message", {
      user: socket.id.substring(0, 4),
      text: message
    });
  });

  socket.on("disconnect", () => console.log("Socket Disconnected"));
});

server.listen(3000, () => console.log("Live chat active at http://localhost:3000"));
```

### File: `index.html`
```html
<!DOCTYPE html>
<html>
<head><title>Socket Chat</title></head>
<body style="font-family:sans-serif; padding:20px;">
  <h2>Socket.io Chatroom</h2>
  <label>Select Room: </label>
  <select id="roomSelect" onchange="switchRoom()">
    <option value="lobby">Lobby</option>
    <option value="gaming">Gaming Room</option>
  </select>
  <br><br>
  <div id="messages" style="border:1px solid #ccc; height:200px; overflow-y:auto; padding:10px; width:300px; margin-bottom:10px;"></div>
  <input type="text" id="msgInput" placeholder="Type message...">
  <button onclick="sendMsg()">Send</button>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    let room = "lobby";

    // Join default room
    socket.emit("join_room", room);

    function switchRoom() {
      room = document.getElementById("roomSelect").value;
      document.getElementById("messages").innerHTML = ""; // Clear messages
      socket.emit("join_room", room);
    }

    function sendMsg() {
      const txt = document.getElementById("msgInput").value;
      if (!txt) return;
      socket.emit("chat_message", { room, message: txt });
      document.getElementById("msgInput").value = "";
    }

    socket.on("new_message", (data) => {
      const div = document.getElementById("messages");
      div.innerHTML += `<div><b>${data.user}:</b> ${data.text}</div>`;
      div.scrollTop = div.scrollHeight;
    });

    socket.on("notification", (msg) => {
      const div = document.getElementById("messages");
      div.innerHTML += `<div style="color:gray; font-size:12px;"><i>${msg}</i></div>`;
    });
  </script>
</body>
</html>
```

---

## 5. Advanced Production Practices & Security

### Horizontal Scaling (Redis Adapter)
By default, Socket.io manages connection states in memory. If you scale your application to run on multiple server instances behind a load balancer, users connected to Server A will not receive messages sent by users connected to Server B.
- **Solution**: Use the **`@socket.io/redis-adapter`**. This routes all Socket.io events through a Redis server, pub/sub channel sync, ensuring messages are broadcast to users across all server instances.

### Handshake Authentication
To prevent unauthorized users from connecting to your sockets, validate incoming connections during the initial handshake (e.g. verifying their JWT) before allowing them to connect:
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify token...
  if (isValid) {
    next();
  } else {
    next(new Error("Unauthorized connection attempt"));
  }
});
```

---

## 6. Key Takeaways
1. Always start the wrapper **`server.listen(PORT)`**, not the Express `app.listen(PORT)`. If you start `app.listen`, socket connections will fail because standard routes bypass the Socket.io WebSocket attachment.
2. Use **rooms** (`socket.join(room)`) to group sockets dynamically. This prevents messages from being broadcast to unrelated users who are not in the chat.
3. Socket.io includes automatic fallback to HTTP long-polling if the client's network environment blocks WebSocket connections.
