"""
Debug script to test voice coach data retrieval
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def debug_voice_coach_data():
    """Debug why voice coach isn't returning actual data"""
    
    # Initialize Supabase client
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
    question = "Give me a strategic analysis of total revenue in 2024"
    
    print("🔍 Debugging Voice Coach Data Retrieval")
    print("=" * 50)
    print(f"User ID: {user_id}")
    print(f"Question: {question}")
    print()
    
    # Test database connection
    try:
        response = supabase.table("revenue_entries").select("*").eq("user_id", user_id).execute()
        print(f"📊 Database query result:")
        print(f"   Status: Success")
        print(f"   Records found: {len(response.data)}")
        
        if response.data:
            print(f"   Sample record: {response.data[0]}")
            
            # Test the logic from voice_coach.py
            lower_q = question.lower()
            print(f"\n🔍 Question analysis:")
            print(f"   Lowercase: {lower_q}")
            print(f"   Contains 'revenue': {'revenue' in lower_q}")
            print(f"   Contains 'strategic': {'strategic' in lower_q}")
            print(f"   Contains '2024': {'2024' in lower_q}")
            
            # Test the condition
            condition_met = any(word in lower_q for word in ['revenue', 'sales', 'income', 'strategic', 'analysis', 'total'])
            print(f"   Condition met: {condition_met}")
            
            if condition_met:
                print(f"\n📈 Processing revenue data...")
                total_revenue = 0
                yearly_data = {}
                monthly_data = []
                
                for entry in response.data:
                    amount = entry.get('actual_revenue', 0) or entry.get('amount', 0) or entry.get('revenue', 0)
                    if amount:
                        total_revenue += float(amount)
                        year = entry.get('year', 'Unknown')
                        month = entry.get('month', 'Unknown')
                        
                        if year not in yearly_data:
                            yearly_data[year] = 0
                        yearly_data[year] += float(amount)
                        
                        monthly_data.append({
                            'year': year,
                            'month': month,
                            'amount': float(amount)
                        })
                
                print(f"   Total revenue: ${total_revenue:,.2f}")
                print(f"   Yearly data: {yearly_data}")
                print(f"   Monthly entries: {len(monthly_data)}")
                
                # Test 2024 specific logic
                if '2024' in lower_q:
                    revenue_2024 = yearly_data.get(2024, 0)
                    print(f"\n📊 2024 Analysis:")
                    print(f"   Revenue 2024: ${revenue_2024:,.2f}")
                    
                    if revenue_2024 > 0:
                        months_2024 = [d for d in monthly_data if d['year'] == 2024]
                        print(f"   2024 months: {len(months_2024)}")
                        print(f"   2024 data: {months_2024}")
                        
                        if months_2024:
                            avg_monthly = revenue_2024 / len(months_2024)
                            highest_month = max(months_2024, key=lambda x: x['amount'])
                            lowest_month = min(months_2024, key=lambda x: x['amount'])
                            
                            print(f"   Average monthly: ${avg_monthly:,.2f}")
                            print(f"   Highest: {highest_month}")
                            print(f"   Lowest: {lowest_month}")
                            
                            # Generate the expected response
                            analysis = f"Strategic Analysis for 2024: Your total revenue was ${revenue_2024:,.0f} from {len(months_2024)} months. "
                            analysis += f"Average monthly revenue: ${avg_monthly:,.0f}. "
                            
                            if highest_month and lowest_month:
                                variance = ((highest_month['amount'] - lowest_month['amount']) / lowest_month['amount']) * 100
                                analysis += f"Performance variance: {variance:.1f}% between highest (Month {highest_month['month']}: ${highest_month['amount']:,.0f}) and lowest (Month {lowest_month['month']}: ${lowest_month['amount']:,.0f}). "
                                analysis += f"This indicates {'high volatility' if variance > 50 else 'moderate consistency'} in revenue generation."
                            
                            print(f"\n✅ Expected response:")
                            print(f"   {analysis}")
                            return True
                    else:
                        print(f"   No 2024 data found")
                        return False
        else:
            print("   No records found")
            return False
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

if __name__ == "__main__":
    success = debug_voice_coach_data()
    if success:
        print(f"\n✅ Voice coach should return actual data")
    else:
        print(f"\n❌ Voice coach will return generic response")
