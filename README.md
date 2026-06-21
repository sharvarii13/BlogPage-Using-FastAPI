# Aetheria — Elegant FastAPI Blog

Aetheria is a lightweight, responsive, and visually stunning blogging application built using **FastAPI**, **SQLite**, and **JWT authentication** on the backend, paired with a custom dark glassmorphic single-page application (SPA) on the frontend.

## ✨ Features

- **Glassmorphism UI:** Modern backdrop-blur overlays, indigo-purple gradients, glowing focus states, and smooth interface transition animations.
- **Secure Authentication:** Standard JWT token auth flow (username/password validation) with password hashing handled securely via standard PBKDF2-SHA256.
- **Full CRUD Support:** Authenticated users can write, edit, and delete their own blog posts.
- **Client-side Search:** Instantly filter blog posts by matching title or text content as you type.
- **Custom Notifications:** Smoothly animated, contextual toast indicators for errors and successes.

## 🛠️ Tech Stack

- **Backend:** FastAPI, Python 3.9+, SQLAlchemy, PyJWT (python-jose), SQLite
- **Frontend:** Vanilla HTML5, CSS3, ES6 JavaScript, Google Fonts (Outfit, Inter), FontAwesome Icons

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/aetheria-fastapi-blog.git
cd aetheria-fastapi-blog
```

### 2. Set up the virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the development server
```bash
uvicorn main:app --reload
```

Open your browser and navigate to [http://127.0.0.1:8000/](http://127.0.0.1:8000/) to explore the app!
