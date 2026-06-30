requireAuth();

const user = getUser();
if (!user) {
    window.location.href = 'index.html';
    throw new Error('Not authenticated');
}

const postsContainer = document.getElementById("posts-container");
const postCaptionInput = document.getElementById("post-caption");
const postImageInput = document.getElementById("post-image");
const postBtn = document.getElementById("post-btn");
const imgPreviewWrap = document.getElementById("img-preview-wrap");
const imgPreview = document.getElementById("img-preview");
const removeImgBtn = document.getElementById("remove-img-btn");
const composerAvatar = document.getElementById("composer-avatar");
const sbAvatar = document.getElementById("sb-avatar");
const sbName = document.getElementById("sb-name");
const sbHandle = document.getElementById("sb-handle");
const suggestionsList = document.getElementById("suggestions-list");

const avatarUrl = user.avatar?.url || avatar(user.username);

composerAvatar.src = avatarUrl;
sbAvatar.src = avatarUrl;
sbName.textContent = user.username;
sbHandle.textContent = "@" + user.username;

// Image preview
postImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imgPreview.src = event.target.result;
            imgPreviewWrap.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }
});

removeImgBtn.addEventListener("click", () => {
    postImageInput.value = "";
    imgPreviewWrap.classList.add("hidden");
});

// Post creation
postBtn.addEventListener("click", async () => {
    const caption = postCaptionInput.value.trim();
    const imageFile = postImageInput.files[0];
    
    if (!caption) {
        return showToast("Caption cannot be empty", "error");
    }
    
    if (!imageFile) {
        return showToast("Please select an image", "error");
    }
    
    try {
        setLoading(postBtn, true);
        
        // Convert image to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;
            
            try {
                const response = await apiFetch("/posts/create", {
                    method: "POST",
                    body: JSON.stringify({
                        caption,
                        image: base64Image
                    })
                });
                
                showToast("Post created successfully! ✓", "success");
                
                // Clear form
                postCaptionInput.value = "";
                postImageInput.value = "";
                imgPreviewWrap.classList.add("hidden");
                
                // Reload feed
                loadFeed();
                
            } catch (error) {
                showToast(error.message, "error");
            } finally {
                setLoading(postBtn, false);
            }
        };
        reader.readAsDataURL(imageFile);
        
    } catch (error) {
        showToast(error.message, "error");
        setLoading(postBtn, false);
    }
});

// Load suggested users
async function loadSuggestions() {
    try {
        const response = await apiFetch("/auth/users");
        suggestionsList.innerHTML = "";
        
        if (response.users && response.users.length > 0) {
            // Filter out current user
            const others = response.users.filter(u => u._id !== user._id);
            // Slice top 5 suggested users
            const suggested = others.slice(0, 5);
            
            if (suggested.length === 0) {
                suggestionsList.innerHTML = '<div class="no-conversations" style="font-size:0.8rem">No suggestions right now</div>';
                return;
            }
            
            suggested.forEach(u => {
                const suggEl = document.createElement("div");
                suggEl.className = "suggestion-item";
                suggEl.innerHTML = `
                    <img src="${u.avatar?.url || avatar(u.username)}" class="suggestion-avatar" onerror="this.src='${avatar(u.username)}'" />
                    <div class="suggestion-info">
                        <div class="suggestion-name">${sanitizeHTML(u.username)}</div>
                        <div class="suggestion-handle">@${sanitizeHTML(u.username)}</div>
                    </div>
                    <button class="suggestion-msg-btn">Message</button>
                `;
                // Message button redirects to chat
                suggEl.querySelector(".suggestion-msg-btn").addEventListener("click", () => {
                    window.location.href = "chat.html";
                });
                suggestionsList.appendChild(suggEl);
            });
        } else {
            suggestionsList.innerHTML = '<div class="no-conversations" style="font-size:0.8rem">No suggestions right now</div>';
        }
    } catch (err) {
        console.error("Error loading suggestions:", err);
        suggestionsList.innerHTML = '<div class="no-conversations" style="font-size:0.8rem">Failed to load suggestions</div>';
    }
}

// Load feed
async function loadFeed() {
    try {
        const response = await apiFetch("/posts/timeline");
        console.log("Feed response:", response);
        postsContainer.innerHTML = "";
        
        if (response.posts && response.posts.length > 0) {
            response.posts.forEach(post => {
                const postEl = createPostElement(post);
                postsContainer.appendChild(postEl);
            });
        } else {
            postsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📸</div><div>No posts yet. Be the first to share!</div></div>';
        }
    } catch (error) {
        console.error("Error loading feed:", error);
        postsContainer.innerHTML = `<div class="empty-state" style="color:var(--danger)"><div class="empty-state-icon">⚠️</div><div>${error.message}</div></div>`;
    }
}

function createPostElement(post) {
    const postCard = document.createElement("div");
    postCard.className = "post-card";
    
    // Handle missing author
    const authorName = post.author?.username || "Unknown User";
    const authorAvatar = post.author?.avatar?.url ? post.author.avatar.url : avatar(authorName);
    const likesCount = post.likes?.length || 0;
    const commentsCount = post.comments?.length || 0;
    const isLiked = post.likes?.some(like => like._id === user._id || like === user._id);
    
    // Is current user the author of the post?
    const isAuthor = post.author?._id === user._id || post.author === user._id;
    
    // Format date properly
    let dateStr = "Recently";
    if (post.createdAt) {
        dateStr = timeAgo(post.createdAt);
    }
    
    postCard.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start;position:relative">
            <img src="${authorAvatar}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.src='${avatar(authorName)}'" />
            <div style="flex:1">
                <div style="font-weight:600">${sanitizeHTML(authorName)}</div>
                <div style="font-size:.85rem;color:var(--muted)">${dateStr}</div>
            </div>
            ${isAuthor ? `<button class="post-delete-btn" title="Delete post">🗑️</button>` : ""}
        </div>
        
        <p style="margin:12px 0;color:var(--text);line-height:1.5">${sanitizeHTML(post.caption || "")}</p>
        
        ${post.image ? `<img src="${post.image}" alt="post" style="width:100%;max-height:400px;object-fit:cover;border-radius:10px;margin:12px 0" onerror="this.style.display='none'" />` : ""}
        
        <div style="display:flex;gap:20px;margin-top:15px;padding-top:12px;border-top:1px solid var(--border-light);color:var(--muted);font-size:.9rem">
            <button class="like-btn ${isLiked ? 'liked' : ''}" style="background:none;border:none;color:${isLiked ? 'var(--danger)' : 'var(--muted)'};cursor:pointer;font-size:.9rem;font-weight:500;display:flex;align-items:center;gap:4px">
                ${isLiked ? "❤️" : "🤍"} Like (${likesCount})
            </button>
            <button class="comments-toggle-btn" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.9rem;font-weight:500;display:flex;align-items:center;gap:4px">
                💬 Comment (${commentsCount})
            </button>
        </div>
        
        <div class="comments-section" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light)">
            <div class="comments-list hidden" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">
                <!-- comments will load here -->
            </div>
            <div class="comment-input-row" style="display:flex;gap:10px;align-items:center;margin-top:8px">
                <input type="text" placeholder="Write a comment..." class="comment-input" style="flex:1;padding:8px 14px;border:1.5px solid var(--border);border-radius:20px;outline:none;font-size:.85rem;background:var(--bg);color:var(--text)" />
                <button class="comment-send-btn" style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:white;border:none;cursor:pointer;display:grid;place-items:center">➔</button>
            </div>
        </div>
    `;
    
    // Like button handler
    const likeBtn = postCard.querySelector(".like-btn");
    likeBtn.addEventListener("click", async () => {
        try {
            await apiFetch("/posts/like", {
                method: "POST",
                body: JSON.stringify({ postId: post._id })
            });
            loadFeed();
        } catch (error) {
            showToast(error.message, "error");
        }
    });
    
    // Delete button handler
    if (isAuthor) {
        const deleteBtn = postCard.querySelector(".post-delete-btn");
        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to delete this post?")) return;
            try {
                await apiFetch(`/posts/${post._id}`, { method: "DELETE" });
                showToast("Post deleted successfully! ✓", "success");
                loadFeed();
            } catch (error) {
                showToast(error.message, "error");
            }
        });
    }
    
    // Comments toggler and population
    const commentsToggleBtn = postCard.querySelector(".comments-toggle-btn");
    const commentsSection = postCard.querySelector(".comments-section");
    const commentsList = postCard.querySelector(".comments-list");
    const commentInput = postCard.querySelector(".comment-input");
    const commentSendBtn = postCard.querySelector(".comment-send-btn");
    
    commentsToggleBtn.addEventListener("click", () => {
        const isHidden = commentsList.classList.contains("hidden");
        if (isHidden) {
            // Render comments
            commentsList.innerHTML = "";
            if (post.comments && post.comments.length > 0) {
                post.comments.forEach(c => {
                    const cAuthor = c.author?.username || "User";
                    const cAvatar = c.author?.avatar?.url || avatar(cAuthor);
                    
                    const commentEl = document.createElement("div");
                    commentEl.className = "comment-item";
                    commentEl.style.display = "flex";
                    commentEl.style.gap = "8px";
                    commentEl.style.alignItems = "flex-start";
                    
                    commentEl.innerHTML = `
                        <img src="${cAvatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.src='${avatar(cAuthor)}'" />
                        <div class="comment-bubble" style="background:var(--bg);border-radius:12px;padding:8px 12px;flex:1;font-size:.85rem">
                            <div style="font-weight:600">${sanitizeHTML(cAuthor)}</div>
                            <div style="color:var(--text-secondary);margin-top:2px">${sanitizeHTML(c.comment)}</div>
                        </div>
                    `;
                    commentsList.appendChild(commentEl);
                });
            } else {
                commentsList.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:4px">No comments yet</div>';
            }
            commentsList.classList.remove("hidden");
        } else {
            commentsList.classList.add("hidden");
        }
    });
    
    // Send comment handler
    const submitComment = async () => {
        const text = commentInput.value.trim();
        if (!text) return;
        try {
            commentInput.disabled = true;
            commentSendBtn.disabled = true;
            
            await apiFetch("/posts/comment", {
                method: "POST",
                body: JSON.stringify({ postId: post._id, comment: text })
            });
            
            commentInput.value = "";
            showToast("Comment posted! ✓", "success");
            loadFeed();
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            commentInput.disabled = false;
            commentSendBtn.disabled = false;
        }
    };
    
    commentSendBtn.addEventListener("click", submitComment);
    commentInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            submitComment();
        }
    });
    
    return postCard;
}

// Logout handler
document.getElementById("logout-btn").addEventListener("click", () => {
    logout();
});

// Load suggestions & feed
loadSuggestions();
loadFeed();
