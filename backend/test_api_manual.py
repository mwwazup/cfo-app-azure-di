"""
Manual API testing script for Windows
Easy way to test your RAG endpoints without curl
"""

import requests
import json
from datetime import datetime

def test_voice_coach_v2_detailed():
    """Test Voice Coach V2 with detailed output"""
    
    base_url = "http://localhost:8000"
    
    print("🧪 Manual API Test - Voice Coach V2")
    print("=" * 60)
    
    # Test request
    test_data = {
        "question": "What was my revenue last month?",
        "user_id": "test-user",
        "timestamp": "2024-09-16T13:25:00Z",
        "context_window": "12_months",
        "auto_seed": True
    }
    
    print("📤 Sending request:")
    print(json.dumps(test_data, indent=2))
    print()
    
    try:
        response = requests.post(
            f"{base_url}/api/voice-coach/v2/ask",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"📥 Response Status: {response.status_code}")
        print()
        
        if response.status_code == 200:
            data = response.json()
            
            print("✅ SUCCESS - Voice Coach V2 Response:")
            print("-" * 40)
            print(f"🤖 Answer: {data.get('answer', 'No answer')}")
            print()
            print(f"📊 Confidence: {data.get('confidence', 0):.2f}")
            print(f"⚡ Processing Time: {data.get('processing_time_ms', 0)}ms")
            print(f"🎯 Actions: {len(data.get('actions', []))}")
            print(f"📋 Evidence: {len(data.get('evidence', []))}")
            print(f"🔗 Data Sources: {', '.join(data.get('data_sources', []))}")
            
            next_steps = data.get('next_steps', [])
            if next_steps:
                print(f"📝 Next Steps:")
                for i, step in enumerate(next_steps, 1):
                    print(f"   {i}. {step}")
            
            print()
            
        else:
            print(f"❌ ERROR: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is your backend server running?")
        print("   Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    except requests.exceptions.Timeout:
        print("⏱️  Timeout: Request took too long (>15s)")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_other_endpoints():
    """Test other available endpoints"""
    
    base_url = "http://localhost:8000"
    
    print("\n🔍 Testing Other Endpoints:")
    print("=" * 40)
    
    # Test health
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"🏥 Health Check: {response.status_code}")
        if response.status_code == 200:
            health_data = response.json()
            print(f"   Status: {health_data.get('status', 'unknown')}")
    except Exception as e:
        print(f"🏥 Health Check: Failed - {e}")
    
    # Test root
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"🏠 Root Endpoint: {response.status_code}")
        if response.status_code == 200:
            root_data = response.json()
            print(f"   Message: {root_data.get('message', 'No message')}")
    except Exception as e:
        print(f"🏠 Root Endpoint: Failed - {e}")

def test_rag_seeding():
    """Test RAG data seeding"""
    
    base_url = "http://localhost:8000"
    
    print("\n🌱 Testing RAG Data Seeding:")
    print("=" * 40)
    
    seed_data = {
        "user_id": "test-user",
        "data_sources": ["revenue_entries"],
        "rebuild_graph": False
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/rag/seed/user-data",
            json=seed_data,
            timeout=30
        )
        
        print(f"📤 Seeding Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Seeding completed:")
            print(f"   Entities: {data.get('entities_created', 0)}")
            print(f"   Relationships: {data.get('relationships_created', 0)}")
            print(f"   Actions: {data.get('actions_generated', 0)}")
            print(f"   Time: {data.get('processing_time_seconds', 0):.2f}s")
        else:
            print(f"❌ Seeding failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Seeding error: {e}")

if __name__ == "__main__":
    test_voice_coach_v2_detailed()
    test_other_endpoints()
    test_rag_seeding()
