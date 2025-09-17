"""
Simple data population script using actual table structure
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def populate_simple_data():
    """Populate with minimal required fields"""
    
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
        os.getenv("SUPABASE_SERVICE_KEY") or 
        os.getenv("SUPABASE_ANON_KEY")
    )
    
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        supabase_key
    )
    
    user_id = "test-user"
    
    print("🌱 Populating graph with simple data...")
    
    # Get revenue entries
    revenue_data = supabase.table('revenue_entries').select('*').limit(5).execute()
    print(f"📊 Found {len(revenue_data.data)} revenue entries to process")
    
    entities_created = 0
    
    # Create financial entities with minimal data
    for entry in revenue_data.data:
        try:
            entity_data = {
                "user_id": user_id,
                "entity_type": "revenue",
                "entity_name": f"Revenue_{entry.get('month')}_{entry.get('year')}",
                "entity_value": float(entry.get('actual_revenue', 0))
            }
            
            result = supabase.table('financial_entities').insert(entity_data).execute()
            
            if result.data:
                entities_created += 1
                print(f"   ✅ Created: {entity_data['entity_name']} = ${entity_data['entity_value']:,.2f}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Create simple relationships
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
                "relationship_strength": 0.8
            }
            
            result = supabase.table('financial_relationships').insert(relationship_data).execute()
            
            if result.data:
                relationships_created += 1
                print(f"   🔗 Linked: {entity['entity_name']} → {next_entity['entity_name']}")
                
        except Exception as e:
            print(f"   ❌ Relationship error: {e}")
    
    # Create simple actions
    actions_created = 0
    simple_actions = [
        {"user_id": user_id, "title": "Review Revenue Trends", "priority": 8},
        {"user_id": user_id, "title": "Optimize Peak Months", "priority": 7},
        {"user_id": user_id, "title": "Address Revenue Gaps", "priority": 9}
    ]
    
    for action in simple_actions:
        try:
            result = supabase.table('action_recommendations').insert(action).execute()
            
            if result.data:
                actions_created += 1
                print(f"   🎯 Action: {action['title']}")
                
        except Exception as e:
            print(f"   ❌ Action error: {e}")
    
    print(f"\n🎉 Population Complete!")
    print(f"   📊 Entities: {entities_created}")
    print(f"   🔗 Relationships: {relationships_created}")
    print(f"   🎯 Actions: {actions_created}")
    
    return entities_created > 0

if __name__ == "__main__":
    success = populate_simple_data()
    if success:
        print("\n✅ Graph populated! Test your RAG system now.")
    else:
        print("\n❌ Population failed.")
