"""
Test direct querying of populated graph data
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def test_direct_graph_query():
    """Test querying the populated graph data directly"""
    
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
    
    print("🔍 Testing Direct Graph Queries")
    print("=" * 40)
    
    # Check entities
    try:
        entities = supabase.table('financial_entities').select('*').eq('user_id', user_id).execute()
        print(f"📊 Found {len(entities.data)} entities:")
        
        total_revenue = 0
        for entity in entities.data:
            revenue = entity.get('entity_value', 0)
            total_revenue += revenue
            print(f"   - {entity.get('entity_name', 'Unknown')}: ${revenue:,.2f}")
        
        print(f"\n💰 Total Revenue: ${total_revenue:,.2f}")
        
        # Find highest and lowest revenue months
        if entities.data:
            sorted_entities = sorted(entities.data, key=lambda x: x.get('entity_value', 0))
            lowest = sorted_entities[0]
            highest = sorted_entities[-1]
            
            print(f"📈 Highest: {highest.get('entity_name', 'Unknown')} - ${highest.get('entity_value', 0):,.2f}")
            print(f"📉 Lowest: {lowest.get('entity_name', 'Unknown')} - ${lowest.get('entity_value', 0):,.2f}")
            
            # Calculate growth
            if len(entities.data) >= 2:
                growth = ((highest.get('entity_value', 0) - lowest.get('entity_value', 0)) / lowest.get('entity_value', 1)) * 100
                print(f"📊 Revenue Range: {growth:.1f}% difference")
        
    except Exception as e:
        print(f"❌ Error querying entities: {e}")
    
    # Check relationships
    try:
        relationships = supabase.table('financial_relationships').select('*').eq('user_id', user_id).execute()
        print(f"\n🔗 Found {len(relationships.data)} relationships")
        
    except Exception as e:
        print(f"❌ Error querying relationships: {e}")
    
    # Check actions
    try:
        actions = supabase.table('action_recommendations').select('*').eq('user_id', user_id).execute()
        print(f"🎯 Found {len(actions.data)} actions")
        
    except Exception as e:
        print(f"❌ Error querying actions: {e}")
    
    # Generate a simple answer based on the data
    if entities.data:
        print(f"\n🤖 Sample Answer Generation:")
        print("=" * 40)
        
        latest_entity = max(entities.data, key=lambda x: f"{x.get('entity_name', '')}")
        revenue_values = [e.get('entity_value', 0) for e in entities.data]
        avg_revenue = sum(revenue_values) / len(revenue_values)
        
        answer = f"""Based on your financial data, I can see you have revenue entries spanning multiple months. 
        
Your revenue shows variation across periods:
- Latest tracked: {latest_entity.get('entity_name', 'Unknown')} with ${latest_entity.get('entity_value', 0):,.2f}
- Average revenue: ${avg_revenue:,.2f}
- Total tracked revenue: ${total_revenue:,.2f}

Key insights:
• Your highest performing month generated ${highest.get('entity_value', 0):,.2f}
• There's a ${growth:.1f}% difference between your best and lowest months
• This suggests opportunities for revenue optimization and consistency improvement"""

        print(answer)
        
        return True
    
    return False

if __name__ == "__main__":
    success = test_direct_graph_query()
    if success:
        print(f"\n✅ Graph data is accessible and can generate insights!")
    else:
        print(f"\n❌ No graph data found")
