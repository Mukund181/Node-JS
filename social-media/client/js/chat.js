requireAuth();

const user = getUser();
const usersList = document.getElementById("users-list");
const chatArea = document.getElementById("chat-area");
const chatEmpty = document.getElementById("chat-empty");
const chatTitle = document.getElementById("chat-title");
const chatSubtitle = document.getElementById("chat-subtitle");
const messagesList = document.getElementById("messages-list");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let selectedUser = null;
let onlineUserIds = new Set();

// Connect to Socket.io
const socket = io(window.location.origin, {
    withCredentials: true
});

socket.on("connect", () => {
    console.log("Connected to real-time chat gateway");
});

socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
});

// Update online users list
socket.on("onlineUsers", (list) => {
    onlineUserIds = new Set(list);
    updateUsersOnlineUI();
});

socket.on("userOnline", ({ userId }) => {
    onlineUserIds.add(userId);
    updateUsersOnlineUI();
});

socket.on("userOffline", ({ userId }) => {
    onlineUserIds.delete(userId);
    updateUsersOnlineUI();
});

// Receive message in real time
socket.on("receiveMessage", (data) => {
    const { senderId, senderName, encryptedMessage } = data;
    
    // If the sender is the currently selected user, append message
    if (selectedUser && selectedUser._id === senderId) {
        const msgEl = document.createElement("div");
        msgEl.className = "message received";
        
        let text = "[Encrypted Message]";
        try {
            text = atob(encryptedMessage);
        } catch (e) {
            console.error("Failed to decrypt message:", e);
        }
        
        msgEl.innerHTML = `
            ${sanitizeHTML(text)}
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        messagesList.appendChild(msgEl);
        messagesList.scrollTop = messagesList.scrollHeight;
    } else {
        // Show notification toast
        showToast(`New message from ${senderName}`, "success");
    }
});

// Typing indicator listeners
socket.on("userTyping", ({ userId, username }) => {
    if (selectedUser && selectedUser._id === userId) {
        chatSubtitle.textContent = "is typing...";
        chatSubtitle.style.color = "var(--success)";
    }
});

socket.on("userStoppedTyping", ({ userId }) => {
    if (selectedUser && selectedUser._id === userId) {
        chatSubtitle.textContent = selectedUser.bio || "Ready to chat";
        chatSubtitle.style.color = "var(--muted)";
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    logout();
});

// Load all users
async function loadUsers() {
    try {
        const response = await apiFetch("/auth/users");
        usersList.innerHTML = "";
        
        if (response.users && response.users.length > 0) {
            // Filter out current user from chat list
            const otherUsers = response.users.filter(u => u._id !== user._id);
            if (otherUsers.length === 0) {
                usersList.innerHTML = '<div class="no-conversations">No other users found</div>';
                return;
            }
            
            otherUsers.forEach(u => {
                const userEl = document.createElement("div");
                userEl.className = "chat-user-item";
                userEl.dataset.userId = u._id;
                
                const isOnline = onlineUserIds.has(u._id);
                
                userEl.innerHTML = `
                    <div class="chat-user-avatar" style="position:relative">
                        <img src="${u.avatar?.url || avatar(u.username)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />
                        <span class="online-dot ${isOnline ? "" : "hidden"}" style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:var(--success);border:2px solid var(--surface);border-radius:50%"></span>
                    </div>
                    <div class="chat-user-info">
                        <div class="chat-user-name">${sanitizeHTML(u.username)}</div>
                        <div class="chat-user-bio">${sanitizeHTML(u.bio || "No bio yet")}</div>
                    </div>
                `;
                userEl.addEventListener("click", (e) => selectUser(e, u));
                usersList.appendChild(userEl);
            });
        } else {
            usersList.innerHTML = '<div class="no-conversations">No users found</div>';
        }
    } catch (error) {
        usersList.innerHTML = `<div class="no-conversations">Error loading users</div>`;
        console.error(error);
    }
}

function updateUsersOnlineUI() {
    document.querySelectorAll(".chat-user-item").forEach(el => {
        const userId = el.dataset.userId;
        const dot = el.querySelector(".online-dot");
        if (dot) {
            if (onlineUserIds.has(userId)) {
                dot.classList.remove("hidden");
            } else {
                dot.classList.add("hidden");
            }
        }
    });
}

// Select a user to chat with
function selectUser(e, u) {
    selectedUser = u;
    
    // Update active state in UI
    document.querySelectorAll(".chat-user-item").forEach(el => el.classList.remove("active"));
    const targetItem = e.currentTarget;
    if (targetItem) {
        targetItem.classList.add("active");
    }
    
    chatTitle.textContent = u.username;
    chatSubtitle.textContent = u.bio || "Ready to chat";
    chatSubtitle.style.color = "var(--muted)";
    chatEmpty.style.display = "none";
    chatArea.style.display = "flex";
    
    // Load messages with this user
    loadMessages();
}

// Load messages between current user and selected user
async function loadMessages() {
    if (!selectedUser) return;
    
    try {
        const response = await apiFetch(`/messages/getMessages?receiverId=${selectedUser._id}`);
        messagesList.innerHTML = "";
        
        if (response.messages && response.messages.length > 0) {
            response.messages.forEach(msg => {
                const msgEl = document.createElement("div");
                const isOwn = msg.sender === user._id || msg.sender._id === user._id;
                msgEl.className = `message ${isOwn ? "sent" : "received"}`;
                
                let text = "[Encrypted Message]";
                if (msg.encryptedMessage) {
                    try {
                        text = atob(msg.encryptedMessage);
                    } catch (e) {
                        console.error("Failed to decrypt message:", e);
                    }
                }
                
                let timeStr = "Recently";
                if (msg.createdAt) {
                    const d = new Date(msg.createdAt);
                    if (!isNaN(d.getTime())) {
                        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                }
                
                msgEl.innerHTML = `
                    ${sanitizeHTML(text)}
                    <span class="message-time">${timeStr}</span>
                `;
                messagesList.appendChild(msgEl);
            });
            // Scroll to bottom
            messagesList.scrollTop = messagesList.scrollHeight;
        } else {
            messagesList.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px">Start the conversation! Say hello 👋</div>`;
        }
    } catch (error) {
        messagesList.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px">Start the conversation! Say hello 👋</div>`;
    }
}

// Send message
async function sendMessage() {
    if (!selectedUser) {
        showToast("Select a user first", "error");
        return;
    }
    
    const message = messageInput.value.trim();
    if (!message) {
        return showToast("Message cannot be empty", "error");
    }
    
    try {
        setLoading(sendBtn, true);
        
        // Base64 encode for demo
        const encryptedMessage = btoa(message);
        
        const response = await apiFetch("/messages/postMessage", {
            method: "POST",
            body: JSON.stringify({
                receiverId: selectedUser._id,
                encryptedMessage: encryptedMessage,
                encryptedKey: "demo_key",
                iv: "demo_iv"
            })
        });
        
        // Emit through socket for real-time delivery
        socket.emit("sendMessage", {
            receiverId: selectedUser._id,
            encryptedMessage: encryptedMessage,
            encryptedKey: "demo_key",
            iv: "demo_iv",
            messageId: response.messageId
        });
        
        // Append to own screen immediately
        const msgEl = document.createElement("div");
        msgEl.className = "message sent";
        msgEl.innerHTML = `
            ${sanitizeHTML(message)}
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        messagesList.appendChild(msgEl);
        messagesList.scrollTop = messagesList.scrollHeight;
        
        messageInput.value = "";
        
        // Stop typing indicator on message sent
        socket.emit("stopTyping", { receiverId: selectedUser._id });
        
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        setLoading(sendBtn, false);
    }
}

// Typing indicators trigger
let typingTimeout = null;
messageInput.addEventListener("input", () => {
    if (!selectedUser) return;
    socket.emit("typing", { receiverId: selectedUser._id });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
    }, 1500);
});

// Event listeners
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Load users on page load
loadUsers();
