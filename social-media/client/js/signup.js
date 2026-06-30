redirectIfAuth();

const form = document.getElementById("signup-form");
const nameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const bioInput = document.getElementById("bio");
const msgEl = document.getElementById("signup-msg");
const btn = document.getElementById("signup-btn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const bio = bioInput.value.trim();
    
    // Validation
    if (!username || username.length < 3) {
        return showMsg(msgEl, "Username must be at least 3 characters");
    }
    if (!email) {
        return showMsg(msgEl, "Email is required");
    }
    if (!password || password.length < 8) {
        return showMsg(msgEl, "Password must be at least 8 characters");
    }
    
    try {
        setLoading(btn, true);
        
        const response = await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username,
                email,
                password,
                bio: bio || undefined
            })
        });
        
        showMsg(msgEl, "Account created! Redirecting...", "success");
        
        // Store user info and redirect
        if (response.user) {
            setUser(response.user);
        }
        
        setTimeout(() => {
            window.location.href = "feed.html";
        }, 1500);
        
    } catch (error) {
        showMsg(msgEl, error.message);
        setLoading(btn, false);
    }
});
