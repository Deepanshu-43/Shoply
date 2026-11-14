# MERN E-commerce Starter

A beginner-friendly MERN storefront starter with product browsing, cart state, and an Express/MongoDB API.

## Requirements
- Node.js 18+
- MongoDB local instance (running on port 27017) or MongoDB Atlas connection string

## Quick Start (Single Command)
Run from the project root:
```bash
npm run dev
```
or on Windows, simply double-click `start.bat`.

This starts both the Express API (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`).

---

## Or Run Separately in Two Terminals

### 1. Run backend
```bash
cd server
npm install
npm run seed
npm run dev
```

### 2. Run frontend (another terminal)
```bash
cd client
npm install
npm run dev
```
Open the Vite URL (http://localhost:5173).
