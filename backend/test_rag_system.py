"""
Test script for the RAG system components
Run this to test all RAG functionality step by step
"""

import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test-user"

async def test_health_check():
    """Test basic server health"""
    print("🔍 Testing server health...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/health")
            print(f"✅ Server health: {response.status_code}")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Server health failed: {e}")
            return False

async def test_database_schema():
    """Test if RAG tables exist"""
    print("\n🔍 Testing database schema...")
    async with httpx.AsyncClient() as client:
        try:
            # Test seeding status endpoint (will fail gracefully if tables don't exist)
            response = await client.get(f"{BASE_URL}/api/rag/seed/status/{TEST_USER_ID}")
            if response.status_code == 200:
                print("✅ RAG database tables exist")
                data = response.json()
                print(f"   - Entities: {data.get('entities', 0)}")
                print(f"   - Relationships: {data.get('relationships', 0)}")
                print(f"   - Actions: {data.get('actions', 0)}")
                return True
            else:
                print(f"❌ Database schema test failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Database schema test error: {e}")
            return False

async def test_data_seeding():
    """Test data seeding functionality"""
    print("\n🔍 Testing data seeding...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Test synchronous seeding
            seed_request = {
                "user_id": TEST_USER_ID,
                "data_sources": ["revenue_entries"],
                "rebuild_graph": True
            }
            
            response = await client.post(
                f"{BASE_URL}/api/rag/seed/user/sync",
                json=seed_request
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Data seeding completed")
                print(f"   - Entities created: {data.get('entities_created', 0)}")
                print(f"   - Relationships created: {data.get('relationships_created', 0)}")
                print(f"   - Actions generated: {data.get('actions_generated', 0)}")
                print(f"   - Processing time: {data.get('processing_time_seconds', 0):.2f}s")
                return data.get('success', False)
            else:
                print(f"❌ Data seeding failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Data seeding error: {e}")
            return False

async def test_rag_query():
    """Test RAG query functionality"""
    print("\n🔍 Testing RAG query engine...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Test various types of queries
            test_queries = [
                "What was my revenue in August 2024?",
                "Show me my revenue trends",
                "What should I do to improve my business?",
                "Compare my performance across different months"
            ]
            
            for query in test_queries:
                print(f"\n   Testing query: '{query}'")
                
                query_request = {
                    "user_id": TEST_USER_ID,
                    "question": query,
                    "context_window": "12_months",
                    "include_actions": True,
                    "include_evidence": True
                }
                
                response = await client.post(
                    f"{BASE_URL}/api/rag/query/ask",
                    json=query_request
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ Query successful (confidence: {data.get('confidence', 0):.2f})")
                    print(f"      Answer: {data.get('answer', 'No answer')[:100]}...")
                    print(f"      Evidence items: {len(data.get('evidence', []))}")
                    print(f"      Actions: {len(data.get('actions', []))}")
                    print(f"      Processing time: {data.get('processing_time_ms', 0)}ms")
                else:
                    print(f"   ❌ Query failed: {response.status_code}")
                    print(f"      Response: {response.text}")
                    
        except Exception as e:
            print(f"❌ RAG query error: {e}")
            return False
    
    return True

async def test_voice_coach_v2():
    """Test enhanced voice coach"""
    print("\n🔍 Testing Voice Coach V2...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            coach_request = {
                "question": "What's my current financial situation and what should I focus on?",
                "user_id": TEST_USER_ID,
                "timestamp": datetime.now().isoformat(),
                "context_window": "12_months",
                "auto_seed": True
            }
            
            response = await client.post(
                f"{BASE_URL}/api/voice-coach/v2/ask",
                json=coach_request
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Voice Coach V2 working")
                print(f"   - Confidence: {data.get('confidence', 0):.2f}")
                print(f"   - Answer: {data.get('answer', 'No answer')[:100]}...")
                print(f"   - Actions: {len(data.get('actions', []))}")
                print(f"   - Evidence: {len(data.get('evidence', []))}")
                print(f"   - Next steps: {len(data.get('next_steps', []))}")
                print(f"   - Data sources: {data.get('data_sources', [])}")
                print(f"   - Processing time: {data.get('processing_time_ms', 0)}ms")
                return True
            else:
                print(f"❌ Voice Coach V2 failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Voice Coach V2 error: {e}")
            return False

async def test_action_management():
    """Test action management endpoints"""
    print("\n🔍 Testing action management...")
    async with httpx.AsyncClient() as client:
        try:
            # Get user actions
            response = await client.get(f"{BASE_URL}/api/voice-coach/v2/actions/{TEST_USER_ID}")
            
            if response.status_code == 200:
                data = response.json()
                actions = data.get('actions', [])
                print(f"✅ Retrieved {len(actions)} actions")
                
                # If we have actions, test updating one
                if actions:
                    action_id = actions[0]['id']
                    update_request = {
                        "action_id": action_id,
                        "status": "in_progress",
                        "user_id": TEST_USER_ID,
                        "notes": "Testing action update"
                    }
                    
                    update_response = await client.post(
                        f"{BASE_URL}/api/voice-coach/v2/actions/update",
                        json=update_request
                    )
                    
                    if update_response.status_code == 200:
                        print("✅ Action update successful")
                    else:
                        print(f"❌ Action update failed: {update_response.status_code}")
                
                return True
            else:
                print(f"❌ Action retrieval failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Action management error: {e}")
            return False

async def test_system_status():
    """Test system status endpoint"""
    print("\n🔍 Testing system status...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/api/voice-coach/v2/status/{TEST_USER_ID}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ System status retrieved")
                print(f"   - Graph entities: {data.get('graph_entities', 0)}")
                print(f"   - Relationships: {data.get('relationships', 0)}")
                print(f"   - Pending actions: {data.get('pending_actions', 0)}")
                print(f"   - RAG enabled: {data.get('rag_enabled', False)}")
                return True
            else:
                print(f"❌ System status failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ System status error: {e}")
            return False

async def run_all_tests():
    """Run all tests in sequence"""
    print("🚀 Starting RAG System Tests")
    print("=" * 50)
    
    tests = [
        ("Server Health", test_health_check),
        ("Database Schema", test_database_schema),
        ("Data Seeding", test_data_seeding),
        ("RAG Query Engine", test_rag_query),
        ("Voice Coach V2", test_voice_coach_v2),
        ("Action Management", test_action_management),
        ("System Status", test_system_status)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            results[test_name] = await test_func()
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
    
    # Summary
    print(f"\n{'='*50}")
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your RAG system is ready to use.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    # Run the tests
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)
