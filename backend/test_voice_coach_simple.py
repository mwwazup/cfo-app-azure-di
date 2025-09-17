"""
Simple test of Voice Coach V2 functionality
Tests the actual endpoints without complex database connections
"""

import requests
import json
from datetime import datetime

def test_voice_coach_v2():
    """Test Voice Coach V2 endpoint directly"""
    
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Voice Coach V2 Simple")
    print("=" * 50)
    
    # Test data
    test_request = {
        "question": "What was my revenue last month?",
        "user_id": "test-user",
        "timestamp": datetime.now().isoformat(),
        "context_window": "12_months",
        "auto_seed": True
    }
    
    try:
        # Test Voice Coach V2
        print("🔍 Testing Voice Coach V2...")
        response = requests.post(
            f"{base_url}/api/voice-coach/v2/ask",
            json=test_request,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Voice Coach V2 Response:")
            print(f"   Answer: {data.get('answer', 'No answer')[:100]}...")
            print(f"   Confidence: {data.get('confidence', 0)}")
            print(f"   Actions: {len(data.get('actions', []))}")
            print(f"   Evidence: {len(data.get('evidence', []))}")
            print(f"   Processing time: {data.get('processing_time_ms', 0)}ms")
            print(f"   Data sources: {data.get('data_sources', [])}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
    
    except Exception as e:
        print(f"❌ Connection error: {e}")
    
    # Test basic health
    print("\n🔍 Testing server health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is healthy")
        else:
            print(f"⚠️  Server health: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    
    # Test original voice coach for comparison
    print("\n🔍 Testing original voice coach...")
    try:
        original_request = {
            "question": "What was my revenue in August 2024?",
            "user_id": "test-user"
        }
        
        response = requests.post(
            f"{base_url}/api/voice-coach/ask",
            json=original_request,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Original Voice Coach Response:")
            print(f"   Answer: {data.get('answer', 'No answer')[:100]}...")
        else:
            print(f"❌ Original coach error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Original coach error: {e}")

if __name__ == "__main__":
    test_voice_coach_v2()
