"""
Simple script to populate your graph database with real financial data
This will make your RAG system much more powerful
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime
import json

load_dotenv()

def populate_graph_data():
    """Populate graph with your actual financial data"""
    
    # Connect to Supabase
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
        os.getenv("SUPABASE_SERVICE_KEY") or 
        os.getenv("SUPABASE_ANON_KEY")
    )
    
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        supabase_key
    )
    
    print("🔍 Checking your existing financial data...")
    
    # Get revenue entries
    try:
        revenue_data = supabase.table('revenue_entries').select('*').limit(10).execute()
        print(f"✅ Found {len(revenue_data.data)} revenue entries")
        
        if revenue_data.data:
            print("📊 Sample data:")
            for entry in revenue_data.data[:3]:
                print(f"   - {entry.get('month', 'Unknown')}/{entry.get('year', 'Unknown')}: ${entry.get('actual_revenue', 0):,.2f}")
    except Exception as e:
        print(f"❌ Error accessing revenue_entries: {e}")
        return False
    
    # Create financial entities from revenue data
    print("\n🌱 Creating graph entities...")
    
    user_id = "test-user"
    entities_created = 0
    
    for entry in revenue_data.data:
        try:
            # Create revenue entity
            entity_data = {
                "user_id": user_id,
                "entity_type": "revenue",
                "entity_name": f"Revenue_{entry.get('month')}_{entry.get('year')}",
                "entity_value": float(entry.get('actual_revenue', 0)),
                "metadata": {
                    "month": entry.get('month'),
                    "year": entry.get('year'),
                    "source": "revenue_entries",
                    "date_created": datetime.now().isoformat()
                },
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Insert entity
            result = supabase.table('financial_entities').insert(entity_data).execute()
            
            if result.data:
                entities_created += 1
                print(f"   ✅ Created entity: {entity_data['entity_name']}")
            
        except Exception as e:
            print(f"   ⚠️  Error creating entity: {e}")
    
    print(f"\n🎉 Created {entities_created} financial entities!")
    
    # Create some relationships
    print("\n🔗 Creating relationships...")
    
    # Get created entities
    entities = supabase.table('financial_entities').select('*').eq('user_id', user_id).execute()
    
    relationships_created = 0
    for i, entity in enumerate(entities.data[:-1]):
        try:
            next_entity = entities.data[i + 1]
            
            relationship_data = {
                "user_id": user_id,
                "source_entity_id": entity['id'],
                "target_entity_id": next_entity['id'],
                "relationship_type": "temporal_sequence",
                "relationship_strength": 0.8,
                "metadata": {
                    "description": f"Revenue progression from {entity['entity_name']} to {next_entity['entity_name']}",
                    "source": "auto_generated"
                },
                "created_at": datetime.now().isoformat()
            }
            
            result = supabase.table('financial_relationships').insert(relationship_data).execute()
            
            if result.data:
                relationships_created += 1
                print(f"   ✅ Created relationship: {entity['entity_name']} → {next_entity['entity_name']}")
                
        except Exception as e:
            print(f"   ⚠️  Error creating relationship: {e}")
    
    print(f"\n🎉 Created {relationships_created} relationships!")
    
    # Create some action recommendations
    print("\n🎯 Creating action recommendations...")
    
    actions_created = 0
    sample_actions = [
        {
            "title": "Analyze Revenue Trends",
            "description": "Review monthly revenue patterns to identify growth opportunities",
            "priority": 8,
            "estimated_impact": 5000.0,
            "time_horizon": "1_month"
        },
        {
            "title": "Optimize High-Performing Months", 
            "description": "Investigate factors that led to peak revenue months and replicate strategies",
            "priority": 7,
            "estimated_impact": 3000.0,
            "time_horizon": "2_months"
        },
        {
            "title": "Address Revenue Dips",
            "description": "Identify and mitigate factors causing revenue decreases",
            "priority": 9,
            "estimated_impact": 4000.0,
            "time_horizon": "immediate"
        }
    ]
    
    for action in sample_actions:
        try:
            action_data = {
                "user_id": user_id,
                "title": action["title"],
                "description": action["description"],
                "priority": action["priority"],
                "status": "pending",
                "estimated_impact": action["estimated_impact"],
                "time_horizon": action["time_horizon"],
                "prerequisites": [],
                "success_metrics": {"revenue_increase": "5%", "implementation_time": "30_days"},
                "metadata": {"source": "auto_generated", "category": "revenue_optimization"},
                "created_at": datetime.now().isoformat()
            }
            
            result = supabase.table('action_recommendations').insert(action_data).execute()
            
            if result.data:
                actions_created += 1
                print(f"   ✅ Created action: {action['title']}")
                
        except Exception as e:
            print(f"   ⚠️  Error creating action: {e}")
    
    print(f"\n🎉 Created {actions_created} action recommendations!")
    
    print("\n" + "="*60)
    print("🎉 GRAPH POPULATION COMPLETE!")
    print("="*60)
    print(f"📊 Summary:")
    print(f"   - Entities: {entities_created}")
    print(f"   - Relationships: {relationships_created}")
    print(f"   - Actions: {actions_created}")
    print(f"\n🚀 Your RAG system now has real data to work with!")
    print("   Try asking: 'What was my revenue trend over the last few months?'")
    
    return True

if __name__ == "__main__":
    success = populate_graph_data()
    if success:
        print("\n✅ Ready to test enhanced RAG system!")
    else:
        print("\n❌ Population failed - check your database connection")
