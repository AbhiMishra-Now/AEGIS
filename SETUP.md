# AEGIS Project Setup Guide

## New Project Structure

The project has been reorganized with the frontend code in a dedicated `frontend/` folder:

```
AEGIS/
├── frontend/               # React + Vite + Tailwind dashboard
│   ├── src/               # All frontend source code
│   ├── index.html         # Entry HTML
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json      # TypeScript config
│   ├── vite.config.ts     # Vite build config
│   └── README.md          # Frontend-specific docs
│
├── backend/               # Python FastAPI backend
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env              # Add to .gitignore (confidential)
│   ├── routers/
│   ├── mcp/
│   ├── vertex/
│   ├── gemini/
│   └── wa/
│
├── .gitignore            # Excludes all confidential files
├── README.md             # Main project documentation
└── (root config files moved to frontend/)
```

## Getting Started

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your credentials

# Run the server
python main.py
```

## Confidential Files Handling

All confidential files are protected by `.gitignore`:

- **Environment files**: `.env`, `.env.local`, `.env.*.local`
- **Backend secrets**: `backend/.env`, `backend/.env.local`
- **Private keys**: `**/secrets`, `**/.ssh`, `**/.aws`
- **Credentials**: `**/.credentials`
- **Cache & build**: `node_modules/`, `dist/`, `build/`, `__pycache__/`

**Important**: 
- Never commit `.env` files
- Use `.env.example` as a template
- Store real credentials only locally
- Rotate keys regularly

## Full Workspace Setup

To set up the entire workspace:

1. **Clone/Navigate to project**:
   ```bash
   cd AEGIS
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install backend dependencies**:
   ```bash
   cd backend
   python -m venv venv
   # Activate venv (see Backend Development section)
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your credentials
   cd ..
   ```

5. **Start services**:
   - **Terminal 1 - Backend**:
     ```bash
     cd backend
     # (with venv activated)
     python main.py
     ```
   - **Terminal 2 - Frontend**:
     ```bash
     cd frontend
     npm run dev
     ```

## Available Scripts

### Frontend (`frontend/`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (`backend/`)
- `python main.py` - Start FastAPI server
- See backend README for additional scripts

## API Communication

Frontend communicates with backend via:
- REST API endpoints (`/api/*`)
- WebSocket connection (`/ws/dashboard`)
- All network calls go through `frontend/src/lib/api.ts`

## Git Workflow

The `.gitignore` file automatically excludes:
- All `.env` files
- `node_modules/` and dependencies
- Build artifacts
- IDE settings (`.vscode/`, `.idea/`)
- OS files (`Thumbs.db`, `.DS_Store`)
- Python cache (`__pycache__/`)

Safe to commit:
- Source code
- Configuration templates (`.env.example`)
- Documentation
- Build configuration (vite.config.ts, tsconfig.json, etc.)

## Next Steps

1. Install dependencies (frontend and backend)
2. Set up `.env` files with your credentials
3. Start the development servers
4. Navigate to `http://localhost:5173` (frontend) or check backend port
5. Check individual README files for component-specific documentation

For more details, see:
- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Main Project README](README.md)
