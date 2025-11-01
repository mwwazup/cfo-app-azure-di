# WaveRider CFO - Setup Checklist

## ✅ Pre-Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed  
- [ ] Git installed
- [ ] Supabase account created
- [ ] Clerk account created
- [ ] Code editor (VS Code recommended)

## 📁 Repository Setup

- [ ] Clone repository: `git clone <url>`
- [ ] Navigate to project: `cd Waverider`
- [ ] Verify structure exists:
  ```
  Waverider/
  ├── project/          # React frontend
  ├── backend/          # Python backend
  └── docs/            # Documentation
  ```

## 🔧 Frontend Setup

- [ ] Navigate to frontend: `cd project`
- [ ] Install dependencies: `npm install`
- [ ] Copy environment file: `cp .env.example .env`
- [ ] Edit `.env` file:
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
  - [ ] `VITE_BACKEND_URL=http://localhost:8000` - Development URL
- [ ] Verify installation: `npm run dev` (should start on port 5173)

## 🐍 Backend Setup

- [ ] Navigate to backend: `cd backend`
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate virtual environment:
  - Windows: `venv\Scripts\activate`
  - Mac/Linux: `source venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Copy environment file: `cp .env.example .env`
- [ ] Edit `.env` file:
  - [ ] `SUPABASE_URL` - From Supabase project settings
  - [ ] `SUPABASE_DB_PASSWORD` - Database password
  - [ ] `CLERK_SECRET_KEY` - From Clerk dashboard
  - [ ] `ANTHROPIC_API_KEY` - For Claude AI (optional)
- [ ] Verify installation: `python main.py` (should start on port 8000)

## 🗄️ Database Setup

- [ ] Access Supabase dashboard
- [ ] Run SQL migrations:
  ```bash
  cd backend
  python -m alembic upgrade head
  ```
- [ ] Verify tables exist:
  - [ ] `financial_documents`
  - [ ] `revenue_entries`
  - [ ] `kpi_records`
  - [ ] `users` / `profiles`
- [ ] Check RLS policies are enabled

## 🧪 Testing the Setup

### Backend Test
- [ ] Start backend: `python main.py`
- [ ] Test health endpoint: `http://localhost:8000/api/health`
- [ ] Should return: `{"status": "healthy"}`

### Frontend Test  
- [ ] Start frontend: `npm run dev`
- [ ] Open: `http://localhost:5173`
- [ ] Should see login page
- [ ] Test login with development account

### Integration Test
- [ ] Run full stack: `npm run dev:full`
- [ ] Test manual P&L form creation
- [ ] Test file upload
- [ ] Verify data saves to database

## 🔍 Troubleshooting Checklist

### Frontend Issues
- [ ] Check Node.js version: `node --version`
- [ ] Clear npm cache: `npm cache clean --force`
- [ ] Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- [ ] Check browser console for errors
- [ ] Verify environment variables in `.env`

### Backend Issues
- [ ] Check Python version: `python --version`
- [ ] Verify virtual environment is active
- [ ] Update pip: `pip install --upgrade pip`
- [ ] Check port 8000 availability: `netstat -ano | findstr :8000`
- [ ] View backend logs for errors

### Database Issues
- [ ] Test Supabase connection in backend
- [ ] Check migration status: `python -m alembic current`
- [ ] Verify RLS policies in Supabase dashboard
- [ ] Check table permissions

### Authentication Issues
- [ ] Verify Clerk keys are correct
- [ ] Check frontend/backend Clerk configuration
- [ ] Test user creation in Supabase

## 🚀 Production Readiness

### Environment Variables
- [ ] Production Clerk keys configured
- [ ] Production Supabase credentials
- [ ] Backend URL updated for production
- [ ] CORS domains configured

### Security
- [ ] No hardcoded secrets
- [ ] Environment variables secured
- [ ] RLS policies verified
- [ ] HTTPS configured

### Performance
- [ ] Frontend build tested: `npm run build`
- [ ] Backend performance tested
- [ ] Database queries optimized
- [ ] Error handling verified

## 📚 Documentation

- [ ] Read `README_PRODUCTION.md` for deployment
- [ ] Read `README_DEVELOPMENT.md` for development
- [ ] Review API documentation
- [ ] Check component documentation

---

## ✅ Setup Complete!

When all checkboxes are checked, your WaveRider CFO application should be fully functional and ready for development or production use.

### Next Steps:
1. Start building features
2. Write tests
3. Deploy to staging
4. Deploy to production

**Need help?** Check the troubleshooting section or review the documentation files.
