# MediQuick – Online Medicine Delivery System

A working MERN-style college project starter with:
- React + Vite frontend
- Express backend
- MongoDB-ready API
- JWT authentication
- Medicine catalog
- Search/filter
- Cart
- Demo checkout
- Orders
- Prescription upload
- Admin dashboard
- Optional Gemini Assistant with fallback

## Run

### Server
cd server
npm install
copy .env.example .env   # Windows
npm run dev

### Client
cd client
npm install
npm run dev

Open http://localhost:5173

The project includes an attached local database at `server/data/database.json`.
No MongoDB installation is required for the included database. Medicine data is loaded from this file, and registered users, orders, and prescription records are written back to it so they persist after restarting the server.

The frontend files and UI are unchanged. The backend keeps the same API routes used by the existing React client.
