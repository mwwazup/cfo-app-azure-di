# WaveRider CFO - Production Setup Guide

## 🚀 Production Architecture

**Frontend**: React + TypeScript + Vite (Port 5173)
**Backend**: Python FastAPI (Port 8000) 
**Database**: Supabase PostgreSQL
**Authentication**: Clerk
**AI Services**: Claude + Azure Document Intelligence

## 📋 Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- Clerk account

### Installation

1. **Frontend Dependencies**:
```bash
cd project
npm install
```

2. **Backend Dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

3. **Environment Configuration**:
```bash
# Backend environment
cp backend/.env.example backend/.env
# Fill in: SUPABASE_URL, SUPABASE_DB_PASSWORD, CLERK_SECRET_KEY, etc.

# Frontend environment  
cp project/.env.example project/.env
# Fill in: VITE_CLERK_PUBLISHABLE_KEY, VITE_BACKEND_URL=http://localhost:8000
```

## 🏃‍♂️ Running the Application

### Development (Full Stack)
```bash
cd project
npm run dev:full
```
This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

### Separate Terminals
```bash
# Terminal 1: Frontend
cd project
npm run dev

# Terminal 2: Backend  
cd backend
python main.py
```

## 🌍 Production Deployment

### Frontend Deployment
1. **Build for production**:
```bash
cd project
npm run build
```

2. **Deploy `dist/` folder** to:
   - Vercel, Netlify, AWS S3, or any static hosting
   - Set environment variable: `VITE_BACKEND_URL=https://your-backend-domain.com`

### Backend Deployment
1. **Deploy Python FastAPI** to:
   - Railway, Render, AWS ECS, or any Python hosting
   - Port 8000 must be exposed
   - Set all environment variables from `backend/.env`

2. **Health Check**: `GET /api/health` should return status

### Database Setup
1. **Supabase Project**: Already configured with RLS policies
2. **Run migrations**:
```bash
cd backend
python -m alembic upgrade head
```

## 🔧 Key Configuration Files

- `project/package.json` - Frontend dependencies and scripts
- `backend/main.py` - FastAPI application entry point  
- `backend/requirements.txt` - Python dependencies
- `project/.env` - Frontend environment variables
- `backend/.env` - Backend environment variables

## 🛡️ Security Features

- **Authentication**: Clerk handles user authentication
- **Database**: Row Level Security (RLS) policies in Supabase
- **API**: CORS configured for production domains
- **Environment**: All secrets stored in environment variables

## 📊 API Endpoints

### Financial Documents
- `POST /api/financial-documents` - Create documents
- `GET /api/financial-documents` - List documents  
- `PUT /api/financial-documents/{id}` - Update documents
- `DELETE /api/financial-documents/{id}` - Delete documents

### Revenue & KPIs
- `GET /api/revenue-entries` - Revenue data
- `POST /api/revenue-entries` - Create/update revenue
- `GET /api/revenue-kpis` - KPI data
- `POST /api/kpi-records` - KPI records

### AI & Analysis
- AI coaching endpoints
- Document analysis endpoints
- Azure Document Intelligence integration

## 🔍 Troubleshooting

### Backend Issues
- Check Python dependencies: `pip install -r requirements.txt`
- Verify environment variables in `backend/.env`
- Check port 8000 availability
- View logs: `cd backend && python main.py`

### Frontend Issues  
- Verify `VITE_BACKEND_URL=http://localhost:8000` in `project/.env`
- Check if backend is running on port 8000
- Check browser console for errors

### Database Issues
- Verify Supabase credentials in `backend/.env`
- Check if migrations ran: `python -m alembic current`
- Review RLS policies in Supabase dashboard

## 📝 Migration from Development

✅ **Node.js server removed** - Use Python backend only  
✅ **package.json updated** - `npm run dev:full` starts Python backend  
✅ **API endpoints consistent** - Same endpoints, better implementation  
✅ **All features supported** - Python backend has full feature set  

## 🎯 Production Best Practices

1. **Always use Python backend** - Full feature set and production-ready
2. **Environment variables** - Never commit secrets to git
3. **CORS configuration** - Lock down to production domains
4. **Database migrations** - Use Alembic for schema changes
5. **Error monitoring** - Check backend logs regularly
6. **Security** - Keep dependencies updated

---

**🚀 This setup is production-ready and scalable**

For support, check the backend logs and browser console for detailed error information.
