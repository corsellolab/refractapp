# RefractApp

A web application for interactive data visualization and analysis, built with React frontend and Flask backend.

## Features

- Interactive data visualization using D3.js and React-vis
- Material-UI components for modern user interface
- Network visualization capabilities
- Data table interactions with pagination
- Flask API backend for data processing

## Prerequisites

- Node.js 20.19+ or 22.12+ (any current release works)
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
conda init
source ~/.zshrc
# conda env create -f environment.yml
conda env update -f environment.yml
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

## Data

The API reads the data bundle from `data/` at the repo root (gitignored; a symlink to the bundle
works, e.g. `ln -s /path/to/bundle data`). Set `DATA_PATH` to use another location, and
`RESULTS_PATH` if `results/` lives somewhere else (e.g. an external drive).

```
data/
├── visualizations/data/endpoint_performance.csv  # all endpoints: r per model, best r, # selected
├── visualizations/data/mixing_weights.csv        # names, target, MOA, class, hybrid weights
├── panel/all_selected_features.parquet           # every selected (feature, endpoint) pair
├── panel/response_panel.csv, failed_endpoints.csv
└── results/<ENDPOINT>/                           # optional, per endpoint (see below)
```

Everything except `results/` is small and always needed. The full `results/` tree is ~39 GB, so a
local copy can hold just a few endpoint folders: every endpoint still appears in the table with its
model r values, hybrid weights and selected features, and endpoints whose folder is present also get
plots, full metrics, top features and interactive predictions.

## Dashboard

- **Endpoints**: searchable table of all endpoints (filter by screen, predictable = best r ≥ 0.3, or
  downloaded). Selecting one shows a 7-model comparison, predicted vs. observed, hybrid weights by data
  type, SHAP summary, top features and selected features. The model picker applies everywhere.
- **Feature lookup**: pick a feature or gene (e.g. `MUTHS_KRAS`) to list every endpoint that selects it.

`scripts/build_endpoint_metadata.py` collects extra per-endpoint metadata (indication, clinical phase,
...) from every `summary.json` into one CSV; run it where the full `results/` tree lives.

## Running the Application

### 1. Start the Backend Server

```bash
conda activate refractapp
cd api
export REFRACT_USERS="username:password"   # comma-separate multiple accounts
python api.py
```

The Flask server will start on `http://localhost:5001`

### 2. Start the Frontend Development Server

In a new terminal window:

```bash
npm start
```

The React application (served by Vite) will start on `http://localhost:3000` and proxy `/api` requests to the Flask backend on port 5001 (see `vite.config.js`; port 5000 is used by macOS AirPlay Receiver).

## Available Scripts

### Frontend (React)

- `npm start` (or `npm run dev`) - Runs the Vite dev server
- `npm test` - Runs the tests with Vitest
- `npm run build` - Builds the app for production into `build/`
- `npm run preview` - Serves the production build locally

### Backend (Flask)

- `python api/api.py` - Starts the Flask development server

## Development

The application is configured to automatically reload when you make changes to either the frontend or backend code during development.

## Project Structure

```
refractapp/
├── index.html          # Vite entry page
├── vite.config.js      # Vite config (dev server, /api proxy, tests)
├── src/                 # React frontend source code (.jsx)
├── public/             # Static assets copied as-is
├── api/                # Flask backend
│   └── api.py         # Main API server
├── package.json       # Node.js dependencies
├── environment.yml    # Python dependencies
└── README.md         # This file
```

## Technologies Used

- **Frontend**: React, Material-UI, D3.js, React-vis
- **Backend**: Flask, Python, Pandas, NumPy
- **Development**: Vite, Vitest, Conda
