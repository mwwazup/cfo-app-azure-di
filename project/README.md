# WaveRider CFO - Financial Intelligence Platform

## 🎯 Overview

WaveRider CFO is a comprehensive financial management platform that helps businesses track revenue, analyze performance, and get AI-powered financial insights.

### Key Features
- 📊 **Revenue Tracking & KPIs** - Real-time financial metrics and goal tracking
- 📄 **Document Management** - Upload and analyze financial documents (P&L, Balance Sheets, Cash Flow)
- 🤖 **AI Financial Coach** - Claude-powered financial advice and insights
- 📈 **Interactive Dashboards** - Visual charts and performance analytics
- 🎯 **Goal Setting** - FIR (Future Inspired Revenue) target system
- 📱 **Modern UI** - Built with React, TypeScript, and Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- Clerk account

### Installation
```bash
# Install dependencies
cd project
npm install

cd ../backend  
pip install -r requirements.txt

# Setup environment files
cp backend/.env.example backend/.env
cp project/.env.example project/.env

# Run the application
cd project
npm run dev:full
```

Opens at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## 📚 Documentation

### 📖 **Essential Reading**
- **[Setup Checklist](./SETUP_CHECKLIST.md)** - Step-by-step installation guide
- **[Development Guide](./README_DEVELOPMENT.md)** - Development setup and commands
- **[Production Guide](./README_PRODUCTION.md)** - Deployment and production configuration

### 🔧 **Technical Documentation**
- **[API Documentation](../backend/docs/api.md)** - Backend API endpoints
- **[Database Schema](../backend/docs/database.md)** - Database structure and migrations
- **[Component Library](./docs/components.md)** - Frontend components and usage

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Python FastAPI │    │   Supabase DB   │
│   (Port 5173)   │◄──►│   (Port 8000)   │◄──►│   PostgreSQL    │
│                 │    │                 │    │                 │
│ • UI Components │    │ • API Endpoints │    │ • Financial Data│
│ • State Mgmt    │    │ • Auth (Clerk)  │    │ • RLS Policies  │
│ • Charts        │    │ • AI Integration│    │ • Migrations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   External APIs │
                    │                 │
                    │ • Claude AI     │
                    │ • Azure DI      │
                    │ • Clerk Auth    │
                    └─────────────────┘
```

## 🎯 Key Features in Detail

### 📊 Revenue & KPI Management
- Real-time revenue tracking with monthly entries
- Automatic KPI generation (growth rate, profit margin, velocity)
- FIR (Future Inspired Revenue) goal system with intelligent seasonal distribution
- Year-over-year comparisons and trend analysis

### 📄 Financial Document Processing
- Upload PDF, CSV, and image files
- Automatic data extraction using Azure Document Intelligence
- Manual P&L entry forms
- Document organization and filtering by date ranges

### 🤖 AI-Powered Insights
- Claude AI integration for financial coaching
- Personalized recommendations based on your data
- Conversation history and context awareness
- Multi-turn dialogues for complex financial questions

### 📈 Interactive Visualizations
- Revenue charts with FIR targets and actuals
- KPI dashboards with trend indicators
- Financial document breakdowns (radial charts)
- Year-to-date aggregations and comparisons

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

# Lint code
npm run lint
```

## 🌍 Deployment

### Frontend Deployment
1. Build: `npm run build`
2. Deploy `dist/` folder to Vercel, Netlify, or AWS S3
3. Set environment variables in hosting platform

### Backend Deployment  
1. Deploy Python FastAPI to Railway, Render, or AWS ECS
2. Set environment variables from `backend/.env`
3. Ensure port 8000 is exposed

See [Production Guide](./README_PRODUCTION.md) for detailed deployment instructions.

## 🛡️ Security

- **Authentication**: Clerk handles user authentication and session management
- **Database**: Row Level Security (RLS) policies in Supabase ensure data isolation
- **API**: CORS configured for production domains
- **Environment**: All secrets stored in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m "Description of changes"`
5. Push branch: `git push origin feature-name`
6. Create pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support:
1. Check the [Setup Checklist](./SETUP_CHECKLIST.md) for installation issues
2. Review the [Development Guide](./README_DEVELOPMENT.md) for development questions  
3. See the [Production Guide](./README_PRODUCTION.md) for deployment help
4. Check backend logs and browser console for detailed error information
5. Create an issue in the repository with detailed error description

---

**🚀 Built for financial clarity and business growth**
