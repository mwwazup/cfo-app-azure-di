# Backend Environment Setup

The backend requires these environment variables in a `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional - Skip service checks for testing
SKIP_SERVICE_CHECKS=0
SKIP_DB=0

# OpenAI (if using AI features)
OPENAI_API_KEY=your_openai_api_key
```

## Quick Setup:
1. Copy the values from your frontend `.env.local` file
2. Create `backend/.env` with the above variables
3. Use the same SUPABASE_URL and add the SERVICE_ROLE_KEY

## Testing the Fix:
After setting up the environment:
1. Start backend: `python -m uvicorn main:app --reload --port 5180`
2. Test revenue endpoint: `GET http://localhost:5180/api/revenue-entries/years?userId=test-id`
3. Frontend should now work without RLS errors

## What was Fixed:
- Frontend now uses backend API endpoints instead of direct Supabase calls
- Backend uses service role key to bypass RLS policies
- Proper authentication flow: Frontend → Backend API → Supabase
