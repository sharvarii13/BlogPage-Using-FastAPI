// ==========================================================================
// STATE MANAGEMENT & CONFIG
// ==========================================================================
let token = localStorage.getItem("token") || null;
let currentUser = null;
let allPosts = []; // Local cache of posts for live search filtering

// API Base Path
const API_URL = "/api";

// View element selectors
const views = {
    home: document.getElementById("home-view"),
    detail: document.getElementById("post-detail-view"),
    login: document.getElementById("login-view"),
    register: document.getElementById("register-view"),
    form: document.getElementById("post-form-view")
};

// ==========================================================================
// UTILITY FUNCTIONS & TOAST SYSTEM
// ==========================================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const iconClass = type === "success" 
        ? "fa-solid fa-circle-check" 
        : "fa-solid fa-circle-xmark";
        
    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove toast after animation completes
    setTimeout(() => {
        toast.style.animation = "toastSlideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Simple HTML escaping helper to prevent XSS
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}

// Date formatter
function formatDate(dateString) {
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
        return dateString;
    }
}

// Custom text formatter to support simple markdown paragraphs and styling
function formatPostContent(text) {
    if (!text) return "";
    const escaped = escapeHtml(text);
    // Replace double newlines with paragraphs, single newlines with breaks
    return escaped
        .split(/\n\n+/)
        .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
}

// ==========================================================================
// VIEW ROUTING / NAVIGATION
// ==========================================================================
function showView(viewName) {
    // Hide all views
    Object.keys(views).forEach(key => {
        if (views[key]) {
            views[key].classList.add("hidden");
            views[key].classList.remove("view-animate");
        }
    });

    // Show selected view
    const activeView = views[viewName];
    if (activeView) {
        activeView.classList.remove("hidden");
        // Force reflow
        void activeView.offsetWidth;
        activeView.classList.add("view-animate");
    }

    // Update nav links active class
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    
    if (viewName === "home") {
        document.getElementById("nav-home").classList.add("active");
    } else if (viewName === "login") {
        document.getElementById("nav-login").classList.add("active");
    } else if (viewName === "register") {
        document.getElementById("nav-register").classList.add("active");
    } else if (viewName === "form" && !document.getElementById("form-post-id").value) {
        document.getElementById("nav-new-post").classList.add("active");
    }

    // Scroll window back to top
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================================================
// API REQUEST WRAPPER
// ==========================================================================
async function apiFetch(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    // Set headers
    options.headers = options.headers || {};
    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, options);
        
        if (response.status === 204) {
            return null; // No content responses
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            // Handle JWT token expiry or invalidation
            if (response.status === 401 && token) {
                logout();
                showToast("Session expired. Please log in again.", "error");
            }
            throw new Error(data.detail || "Something went wrong");
        }
        
        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// ==========================================================================
// AUTHENTICATION FLOWS
// ==========================================================================
async function checkAuthStatus() {
    if (token) {
        try {
            currentUser = await apiFetch("/me");
            updateAuthUI();
        } catch (error) {
            // Error handled by apiFetch (will clear token if 401)
            token = null;
            currentUser = null;
            localStorage.removeItem("token");
            updateAuthUI();
        }
    } else {
        updateAuthUI();
    }
}

function updateAuthUI() {
    const navNewPost = document.getElementById("nav-new-post");
    const navLogin = document.getElementById("nav-login");
    const navRegister = document.getElementById("nav-register");
    const userBadge = document.getElementById("user-badge");
    const usernameDisplay = document.getElementById("username-display");

    if (currentUser) {
        navNewPost.classList.remove("hidden");
        navLogin.classList.add("hidden");
        navRegister.classList.add("hidden");
        userBadge.classList.remove("hidden");
        usernameDisplay.textContent = currentUser.username;
    } else {
        navNewPost.classList.add("hidden");
        navLogin.classList.remove("hidden");
        navRegister.classList.remove("hidden");
        userBadge.classList.add("hidden");
        usernameDisplay.textContent = "";
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem("token");
    updateAuthUI();
    showToast("Logged out successfully");
    fetchPosts();
    showView("home");
}

// ==========================================================================
// BLOG POST OPERATIONS & RENDERING
// ==========================================================================
async function fetchPosts() {
    const postsList = document.getElementById("posts-list");
    postsList.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin loading-spinner"></i>
            <p>Fetching beautiful stories...</p>
        </div>
    `;

    try {
        allPosts = await apiFetch("/posts");
        renderPosts(allPosts);
    } catch (error) {
        postsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation" style="color: var(--danger-color)"></i>
                <h3>Failed to load articles</h3>
                <p>${escapeHtml(error.message)}</p>
                <button class="btn btn-secondary" onclick="fetchPosts()" style="margin-top: 15px;">Retry</button>
            </div>
        `;
    }
}

function renderPosts(posts) {
    const postsList = document.getElementById("posts-list");
    
    if (posts.length === 0) {
        postsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <h3>No articles found</h3>
                <p>Be the first to publish a story on Aetheria!</p>
            </div>
        `;
        return;
    }

    postsList.innerHTML = "";
    posts.forEach(post => {
        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
            <div>
                <h3 class="post-card-title">${escapeHtml(post.title)}</h3>
                <p class="post-card-excerpt">${escapeHtml(post.content)}</p>
            </div>
            <div class="post-card-footer">
                <span class="post-card-author"><i class="fa-regular fa-user"></i> ${escapeHtml(post.owner.username)}</span>
                <span class="post-card-date"><i class="fa-regular fa-calendar"></i> ${formatDate(post.created_at)}</span>
            </div>
        `;
        card.addEventListener("click", () => showPostDetails(post.id));
        postsList.appendChild(card);
    });
}

async function showPostDetails(postId) {
    try {
        const post = await apiFetch(`/posts/${postId}`);
        
        document.getElementById("detail-title").textContent = post.title;
        document.getElementById("detail-author").textContent = post.owner.username;
        document.getElementById("detail-date").textContent = formatDate(post.created_at);
        document.getElementById("detail-content").innerHTML = formatPostContent(post.content);
        
        const actionsContainer = document.getElementById("detail-actions");
        
        // Show edit/delete options if authenticated user owns the post
        if (currentUser && post.owner_id === currentUser.id) {
            actionsContainer.classList.remove("hidden");
            
            // Set button click actions
            document.getElementById("detail-edit-btn").onclick = () => launchEditPost(post);
            document.getElementById("detail-delete-btn").onclick = () => deletePost(post.id);
        } else {
            actionsContainer.classList.add("hidden");
        }
        
        showView("detail");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function launchEditPost(post) {
    document.getElementById("form-view-title").textContent = "Edit Article";
    document.getElementById("form-post-id").value = post.id;
    document.getElementById("post-title").value = post.title;
    document.getElementById("post-content").value = post.content;
    document.getElementById("form-submit-btn").textContent = "Update Article";
    
    showView("form");
}

function launchCreatePost() {
    document.getElementById("form-view-title").textContent = "Write a New Story";
    document.getElementById("form-post-id").value = "";
    document.getElementById("post-form").reset();
    document.getElementById("form-submit-btn").textContent = "Publish Article";
    
    showView("form");
}

async function deletePost(postId) {
    if (!confirm("Are you sure you want to permanently delete this article?")) {
        return;
    }
    
    try {
        await apiFetch(`/posts/${postId}`, { method: "DELETE" });
        showToast("Article deleted successfully");
        fetchPosts();
        showView("home");
    } catch (error) {
        showToast(error.message, "error");
    }
}

// ==========================================================================
// EVENT LISTENERS & SETUP
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    
    // Check initial Auth status
    checkAuthStatus();
    
    // Initial fetch of articles
    fetchPosts();

    // Nav logo / Home buttons
    document.getElementById("nav-logo-btn").addEventListener("click", (e) => {
        e.preventDefault();
        fetchPosts();
        showView("home");
    });
    document.getElementById("nav-home").addEventListener("click", (e) => {
        e.preventDefault();
        fetchPosts();
        showView("home");
    });
    
    // Auth navigation buttons
    document.getElementById("nav-login").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("login-form").reset();
        showView("login");
    });
    document.getElementById("nav-register").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("register-form").reset();
        showView("register");
    });
    document.getElementById("nav-logout").addEventListener("click", (e) => {
        e.preventDefault();
        logout();
    });
    
    // Switch views link inside Login/Register forms
    document.getElementById("link-to-register").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("register-form").reset();
        showView("register");
    });
    document.getElementById("link-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("login-form").reset();
        showView("login");
    });

    // New Post navigation
    document.getElementById("nav-new-post").addEventListener("click", (e) => {
        e.preventDefault();
        launchCreatePost();
    });
    
    // Back button in Detail view
    document.getElementById("detail-back-btn").addEventListener("click", () => {
        showView("home");
    });

    // Form cancel button
    document.getElementById("form-cancel-btn").addEventListener("click", () => {
        const editId = document.getElementById("form-post-id").value;
        if (editId) {
            showPostDetails(editId);
        } else {
            showView("home");
        }
    });

    // Live search filter input
    document.getElementById("post-search").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderPosts(allPosts);
            return;
        }
        
        const filtered = allPosts.filter(post => 
            post.title.toLowerCase().includes(query) || 
            post.content.toLowerCase().includes(query)
        );
        renderPosts(filtered);
    });

    // Submit handler for Registration
    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("register-username").value.trim();
        const password = document.getElementById("register-password").value;
        const confirmPw = document.getElementById("register-confirm-password").value;

        if (password !== confirmPw) {
            showToast("Passwords do not match", "error");
            return;
        }

        try {
            await apiFetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            showToast("Account created successfully! Please log in.");
            showView("login");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // Submit handler for Login
    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;

        // FastAPI standard login endpoint expects form-urlencoded parameters
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        try {
            const data = await apiFetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData
            });

            token = data.access_token;
            localStorage.setItem("token", token);
            
            showToast("Welcome back!");
            await checkAuthStatus();
            fetchPosts();
            showView("home");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // Submit handler for Blog Post Create/Edit Form
    document.getElementById("post-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("form-post-id").value;
        const title = document.getElementById("post-title").value.trim();
        const content = document.getElementById("post-content").value;

        const isEditing = !!editId;
        const url = isEditing ? `/posts/${editId}` : "/posts";
        const method = isEditing ? "PUT" : "POST";

        try {
            const savedPost = await apiFetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content })
            });

            showToast(isEditing ? "Article updated successfully" : "Article published successfully");
            fetchPosts();
            showPostDetails(savedPost.id);
        } catch (error) {
            showToast(error.message, "error");
        }
    });

});
