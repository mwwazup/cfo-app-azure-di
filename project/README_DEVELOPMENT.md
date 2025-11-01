# WaveRider CFO - Development Setup

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd Waverider

# Install frontend dependencies
cd project
npm install

# Install backend dependencies  
cd ../backend
pip install -r requirements.txt
```

### Environment Setup
```bash
# Backend environment
cd backend
cp .env.example .env
# Edit .env with your Supabase and Clerk credentials

# Frontend environment
cd ../project  
cp .env.example .env
# Edit .env with your Clerk and backend URL
```

### Running the App
```bash
# From project directory
npm run dev:full
```

Opens:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## 📁 Project Structure

```
Waverider/
├── project/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api/            # API calls
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Python FastAPI backend
│   ├── api/                # API endpoints
│   ├── db/                 # Database models
│   ├── migrations/         # Database migrations
│   ├── main.py            # FastAPI app entry
│   └── requirements.txt
└── README_DEVELOPMENT.md   # This file
```

## 🔧 Development Commands

```bash
# Frontend only
npm run dev

# Backend only  
cd backend && python main.py

# Full stack (recommended)
npm run dev:full

# Build for production
npm run build

# Run tests
npm test
```

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill processes on ports 8000 and 5173
netstat -ano | findstr :8000
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Backend Not Starting
- Check Python version: `python --version`
- Install dependencies: `pip install -r requirements.txt`
- Check .env file exists and is configured

### Frontend Can't Connect to Backend
- Verify backend is running on port 8000
- Check `VITE_BACKEND_URL=http://localhost:8000` in project/.env
- Check browser console for CORS errors

## 📚 Learning Resources

- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Supabase**: https://supabase.com/docs
- **Clerk**: https://clerk.com/docs

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature-name`
2. Make changes and test
3. Commit changes: `git commit -m "Description"`
4. Push branch: `git push origin feature-name`
5. Create pull request

---

**Happy coding! 🎉**
