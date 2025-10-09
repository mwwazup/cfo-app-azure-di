#!/usr/bin/env python3
"""
Test script for revenue API endpoints
Run this after setting up the backend environment to verify the RLS fix works
"""

import requests
import json
from datetime import datetime

# Backend URL
BASE_URL = "http://localhost:8080"

# Test user ID (use a real UUID from your database)
TEST_USER_ID = "f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f"

def test_revenue_endpoints():
    """Test the revenue API endpoints"""
    print("🧪 Testing Revenue API Endpoints")
    print("=" * 50)
    
    # Test 1: Get available years
    print("\n1. Testing GET /api/revenue-entries/years")
    try:
        response = requests.get(f"{BASE_URL}/api/revenue-entries/years", 
                              params={"userId": TEST_USER_ID})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Available years: {data.get('years', [])}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Connection error: {e}")
    
    # Test 2: Get revenue entries for current year
    print("\n2. Testing GET /api/revenue-entries")
    try:
        current_year = datetime.now().year
        response = requests.get(f"{BASE_URL}/api/revenue-entries", 
                              params={"userId": TEST_USER_ID, "year": current_year})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data.get('rows', []))} entries for {current_year}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Connection error: {e}")
    
    # Test 3: Create/update revenue entry
    print("\n3. Testing POST /api/revenue-entries")
    try:
        test_data = {
            "userId": TEST_USER_ID,
            "year": datetime.now().year,
            "month": datetime.now().month,
            "actualRevenue": 25000.00
        }
        response = requests.post(f"{BASE_URL}/api/revenue-entries", 
                               json=test_data,
                               headers={"Content-Type": "application/json"})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('ok', False)}")
            if data.get('row'):
                print(f"   Created/Updated entry for {test_data['year']}-{test_data['month']:02d}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Connection error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Test complete! Check results above.")
    print("\nIf you see connection errors, make sure:")
    print("1. Backend is running: python -m uvicorn main:app --reload --port 5180")
    print("2. Environment variables are set in backend/.env")
    print("3. SUPABASE_SERVICE_ROLE_KEY is correctly configured")

if __name__ == "__main__":
    test_revenue_endpoints()
