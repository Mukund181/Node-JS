redirectIfAuth();

const form = document.getElementById("signin-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const msgEl = document.getElementById("signin-msg");
const btn = document.getElementById("signin-btn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validation
    if (!email) {
        return showMsg(msgEl, "Email is required");
    }
    if (!password) {
        return showMsg(msgEl, "Password is required");
    }
    
    try {
        setLoading(btn, true);
        
        const response = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        });
        
        showMsg(msgEl, "Sign in successful! Redirecting...", "success");
        
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
