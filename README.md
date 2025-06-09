# RefractApp

A web application for interactive data visualization and analysis, built with React frontend and Flask backend.

## Features

- Interactive data visualization using D3.js and React-vis
- Material-UI components for modern user interface
- Network visualization capabilities
- Data table interactions with pagination
- Flask API backend for data processing

## Prerequisites

- Node.js (version 14 or higher)
- Python 3.9
- Conda (recommended) or pip for Python package management

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd refractapp
```

### 2. Backend Setup (Flask API)

Create and activate a conda environment:

```bash
conda env create -f environment.yml
conda activate refractapp
```

Alternatively, if using pip:

```bash
pip install flask flask-cors numpy pandas django
```

### 3. Frontend Setup (React)

Install Node.js dependencies:

```bash
npm install
```

## Running the Application

### 1. Start the Backend Server

```bash
conda activate refractapp
cd api
python api.py
```

The Flask server will start on `http://localhost:5000`

### 2. Start the Frontend Development Server

In a new terminal window:

```bash
npm start
```

The React application will start on `http://localhost:3000` and automatically proxy API requests to the Flask backend.

## Available Scripts

### Frontend (React)

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

### Backend (Flask)

- `python api/api.py` - Starts the Flask development server

## Development

The application is configured to automatically reload when you make changes to either the frontend or backend code during development.

## Project Structure

```
refractapp/
├── src/                 # React frontend source code
├── public/             # Public assets
├── api/                # Flask backend
│   └── api.py         # Main API server
├── package.json       # Node.js dependencies
├── environment.yml    # Python dependencies
└── README.md         # This file
```

## Technologies Used

- **Frontend**: React, Material-UI, D3.js, React-vis
- **Backend**: Flask, Python, Pandas, NumPy
- **Development**: Create React App, Conda
