# TOUCH Boutique — MERN E-Commerce App

> "In the process of touching hearts"

A full-stack e-commerce web application built with the **MERN** stack (MongoDB, Express, React, Node.js), featuring a premium fashion boutique experience.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) + bcryptjs |
| File Upload | Multer |
| Email | Nodemailer |

---

## 📁 Project Structure

```
ecommerce-app/
├── backend/               # Express REST API
│   ├── middleware/        # Auth middleware
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── utils/             # Helpers (email, etc.)
│   └── server.js          # Entry point
│
├── frontend/              # React + Vite app
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable components
│       ├── context/       # React contexts
│       ├── pages/         # Page components
│       │   └── admin/     # Admin panel pages
│       └── services/      # API service layer
│
└── .gitignore
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd ecommerce-app
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ecommerce
JWT_SECRET=your_jwt_secret_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

```bash
node server.js
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

---

## ✨ Features

- 🛍️ Product listing with search & category filters
- 🛒 Cart with quantity management (per-user, persistent)
- ❤️ Wishlist
- 👤 User authentication (register / login / forgot password)
- 📦 Order placement & history
- 🚚 Shipping address management
- 💳 Payment method selection (Card / COD)
- 🔐 Admin Panel — Products, Orders, Users management
- 📷 Product image upload (URL or local file)
- 📧 Newsletter subscription
- 📱 Fully responsive — mobile & desktop

---

## 🔐 Environment Variables

**Never commit `.env` files.** See the Setup section above for required variables.

---

## 📜 License

MIT — built with ❤️ in India
