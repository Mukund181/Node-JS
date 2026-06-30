// ─── API Configuration ───────────────────────────────────────────────────────
const API = 'http://localhost:5000/api';

// ─── Helper: fetch wrapper ────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.msg || 'Something went wrong');
    return data;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getUser()       { return JSON.parse(localStorage.getItem('cs_user') || 'null'); }
function setUser(user)   { localStorage.setItem('cs_user', JSON.stringify(user)); }
function clearUser()     { localStorage.removeItem('cs_user'); }
function isLoggedIn()    { return !!getUser(); }

function requireAuth() {
    if (!isLoggedIn()) { window.location.href = 'index.html'; }
}
function redirectIfAuth() {
    if (isLoggedIn()) { window.location.href = 'feed.html'; }
}

// ─── Logout handler ──────────────────────────────────────────────────────────
async function logout() {
    try {
        await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
        console.error("Logout API call failed:", e);
    }
    clearUser();
    window.location.href = 'index.html';
}

// ─── HTML Sanitizer ───────────────────────────────────────────────────────────
function sanitizeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// ─── Toast notifications ──────────────────────────────────────────────────────
function showToast(msg, type = '') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3100);
}

// ─── Button loading state ─────────────────────────────────────────────────────
function setLoading(btn, loading) {
    const text    = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    btn.disabled = loading;
    text?.classList.toggle('hidden', loading);
    spinner?.classList.toggle('hidden', !loading);
}

// ─── Password toggle ──────────────────────────────────────────────────────────
document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
});

// ─── Form message helper ──────────────────────────────────────────────────────
function showMsg(el, msg, type = 'error') {
    el.textContent = msg;
    el.className = `form-msg ${type}`;
    el.classList.remove('hidden');
}

// ─── Time formatter ───────────────────────────────────────────────────────────
function timeAgo(date) {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
}

// ─── Default avatar ───────────────────────────────────────────────────────────
const DEFAULT_AVATAR = `https://ui-avatars.com/api/?background=5b6af0&color=fff&size=128&name=`;
function avatar(name) { return DEFAULT_AVATAR + encodeURIComponent(name || 'U'); }

// ─── Dark Mode Toggle Handler ───────────────────────────────────────────────
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('cs_theme');
    
    // Default to system preference if no saved preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('cs_theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }
}

// Initialize theme immediately on document load
document.addEventListener('DOMContentLoaded', initTheme);
// Also try to run immediately if DOM is already loaded or header is parsed
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initTheme();
}
