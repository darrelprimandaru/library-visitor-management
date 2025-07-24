# Library Visitor Management System

A simple system for tracking library visitors, built for local schools.

## Features

- Barcode check-in and check-out
- Daily snapshots and time distribution of visits
- Visitor log with export functionality
- Student profiles (coming soon)
- Reports and visitor analytics (coming soon)

## Folder Structure

```
backend/    # Node.js + Express + MongoDB (API server)
frontend/   # HTML + JS + CSS (Client)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Installation

1. **Clone the repo**

    ```bash
    git clone https://github.com/YOUR_USERNAME/library-visitor-management.git
    cd library-visitor-management
    ```

2. **Install backend dependencies**

    ```bash
    cd backend
    npm install
    ```

3. **Configure MongoDB**

    - By default, the backend expects a local MongoDB server.
    - For cloud, set your connection string in `.env`:
      ```
      MONGODB_URI=mongodb+srv://<your_atlas_connection>
      ```

4. **Start the backend server**

    ```bash
    node server.js
    ```

5. **Open the frontend**

    - Open `frontend/index.html` in your browser.
    - Or use VS Code’s Live Server.

## Roadmap

- [ ] Student profiles database
- [ ] Real time distribution chart
- [ ] Export/import logs
- [ ] Visitors and reports tabs
- [ ] Cloud deployment guide

## License

MIT

## Author

[@darrelprimandaru](https://github.com/darrelprimandaru)