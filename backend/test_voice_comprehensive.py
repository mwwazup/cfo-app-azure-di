"""
Comprehensive test of all voice AI functionality
"""

import requests
import time

def test_voice_ai_comprehensive():
    """Test all voice AI functionality"""
    
    base_url = "http://localhost:8000"
    user_id = "e2e72fa4-3e63-4b9d-ab12-1ed2ca583fa3"
    
    print("🎤 Comprehensive Voice AI Test")
    print("=" * 50)
    
    # Test cases with your actual data
    test_cases = [
        {
            "name": "2024 Strategic Analysis",
            "question": "Give me a strategic analysis of total revenue in 2024",
            "expected_keywords": ["$563,752", "12 entries", "strategic analysis"]
        },
        {
            "name": "Monthly Revenue Query",
            "question": "What was my revenue in April 2024?",
            "expected_keywords": ["April", "2024", "$48,865"]
        },
        {
            "name": "Revenue Trends",
            "question": "Show me my revenue trends",
            "expected_keywords": ["revenue", "trend", "total"]
        },
        {
            "name": "Follow-up Question",
            "question": "What about May 2024?",
            "expected_keywords": ["May", "2024"]
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {test_case['name']}")
        print(f"Question: {test_case['question']}")
        
        try:
            response = requests.post(
                f"{base_url}/api/voice-coach/ask",
                json={
                    "question": test_case["question"],
                    "user_id": user_id,
                    "timestamp": f"2024-09-16T14:{10+i:02d}:00Z"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get("answer", "")
                
                # Check if expected keywords are present
                keywords_found = [kw for kw in test_case["expected_keywords"] if kw.lower() in answer.lower()]
                
                print(f"✅ Status: {response.status_code}")
                print(f"📝 Answer: {answer[:150]}...")
                print(f"🔍 Keywords found: {keywords_found}")
                print(f"🏷️  Tags: {data.get('tags', [])}")
                
                results.append({
                    "test": test_case["name"],
                    "status": "PASS",
                    "keywords_found": len(keywords_found),
                    "keywords_expected": len(test_case["expected_keywords"]),
                    "has_real_data": any(kw in answer for kw in ["$", "2024", "revenue"])
                })
                
            else:
                print(f"❌ Status: {response.status_code}")
                print(f"Error: {response.text}")
                results.append({
                    "test": test_case["name"],
                    "status": "FAIL",
                    "error": response.status_code
                })
                
        except Exception as e:
            print(f"❌ Connection error: {e}")
            results.append({
                "test": test_case["name"],
                "status": "ERROR",
                "error": str(e)
            })
        
        # Small delay between requests
        time.sleep(1)
    
    # Summary
    print(f"\n📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for r in results if r["status"] == "PASS")
    total = len(results)
    
    for result in results:
        status_icon = "✅" if result["status"] == "PASS" else "❌"
        print(f"{status_icon} {result['test']}: {result['status']}")
        
        if result["status"] == "PASS":
            if result.get("has_real_data"):
                print(f"   📊 Real data: YES")
            else:
                print(f"   📊 Real data: NO (generic response)")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All voice AI functionality working correctly!")
        return True
    else:
        print("⚠️  Some issues remain")
        return False

if __name__ == "__main__":
    success = test_voice_ai_comprehensive()
    exit(0 if success else 1)
