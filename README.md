# WaveRider CFO Dashboard

A comprehensive financial intelligence platform for small business owners, providing AI-powered coaching, KPI tracking, and revenue optimization.

## 🌊 Features

- **Financial Intelligence**: AI-powered coaching with personalized insights
- **KPI Dashboard**: Real-time key performance indicators with trend analysis
- **Revenue Tracking**: Master revenue curve with FIR (Future Inspired Revenue) targets
- **Employee LER**: Labor Efficiency Ratio tracking and bonus calculations
- **Service Mix**: Track service performance and revenue distribution
- **Financial Documents**: Upload and analyze P&L statements with AI
- **Business Intelligence**: Comprehensive analytics and reporting

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **AI**: OpenAI GPT-4 + Azure Document Intelligence
- **Deployment**: Azure (ready for production)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Clerk account
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mwwazup/waverider.git
cd waverider
```

2. **Frontend Setup**
```bash
cd project
npm install
cp .env.example .env
# Add your environment variables
npm run dev
```

3. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your environment variables
uvicorn main:app --reload
```

4. **Database Setup**
```bash
# Run migrations in Supabase SQL editor
# See docs/database-setup.md for detailed instructions
```

## 📚 Documentation

- [Development Guide](docs/development/README.md)
- [Feature Documentation](docs/features/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [API Documentation](docs/api/README.md)

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Review the documentation in the `/docs` folder
- Check existing issues for common problems

## 🔗 Live Demo

[Coming Soon - Deployment in Progress]

---

**Built with ❤️ for small business owners who want to ride their revenue wave to success**
