# Library Visitor Management System

A web-based system for tracking library visitors, built for local schools.

## Features

- Barcode check-in and check-out
- Student profiles database
- Visitor logs with name/class frozen at check-in
- Edit or delete past visitor logs
- CSV import of historical logs (admin only)
- Daily snapshots and time distribution of visits
- Top visiting classes and average visit duration
- Export logs to CSV
- Multi-select checkboxes for batch delete
- Admin login with JWT authentication
- Fully separated frontend and backend

## Folder Structure

```
library-visitor-management/
├── backend/     # Node.js + Express + MongoDB (API server)
└── frontend/    # HTML + JS + CSS (Client)
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm
- MongoDB (local or Atlas)

### Installation

Clone the repository:

```
git clone https://github.com/YOUR_USERNAME/library-visitor-management.git
cd library-visitor-management
```

#### Backend Setup

```
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```
MONGODB_URI=mongodb+srv://<your_mongo_uri>
JWT_SECRET=your_jwt_secret
```

Start the backend server:

```
node server.js
```

#### Frontend

- Open `frontend/index.html` in your browser
- Or use the Live Server extension in VS Code