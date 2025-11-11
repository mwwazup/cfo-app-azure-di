"""
Bonus ROI Analysis API
Calculates return on investment for employee bonus structures
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from api.auth import get_supabase_db

bonus_roi_router = APIRouter()

@bonus_roi_router.get("/api/bonus-roi-analysis")
async def get_bonus_roi_analysis(
    userId: str = Query(..., description="User ID"),
    year: int = Query(..., description="Year to analyze"),
    month: Optional[int] = Query(None, description="Specific month (1-12), omit for YTD")
):
    """
    Calculate bonus program effectiveness metrics
    
    Returns:
        - Total bonus costs
        - LER trend over time (efficiency improvement)
        - Qualification rate
        - Labor cost analysis
    """
    try:
        print(f"[Bonus ROI] Fetching data for userId={userId}, year={year}, month={month}")
        supabase = get_supabase_db()
        print(f"[Bonus ROI] Supabase client initialized")
        
        # Get pay periods for this user and year (same approach as Employee LER page)
        # Note: pay_periods table has: id, user_id, period_name, start_date, end_date, year (but NOT month)
        pay_periods_result = supabase.table('pay_periods').select('id, start_date, end_date, year').eq('user_id', userId).eq('year', year).execute()
        all_pay_periods = pay_periods_result.data or []
        
        # Filter by month if specified (extract month from start_date)
        if month:
            from datetime import datetime
            pay_period_ids = []
            for pp in all_pay_periods:
                start_date = datetime.fromisoformat(pp['start_date'].replace('Z', '+00:00'))
                if start_date.month == month:
                    pay_period_ids.append(pp['id'])
        else:
            pay_period_ids = [pp['id'] for pp in all_pay_periods]
        
        print(f"[Bonus ROI] Found {len(pay_period_ids)} pay periods for year {year}" + (f", month {month}" if month else ""))
        
        if not pay_period_ids:
            print(f"[Bonus ROI] No pay periods found for user {userId}, year {year}")
            records = []
        else:
            # Get all daily records for these pay periods
            records_result = supabase.table('employee_daily_records').select('*').in_('pay_period_id', pay_period_ids).execute()
            records = records_result.data or []
        
        print(f"[Bonus ROI] Found {len(records)} daily records")
        
        # Debug: Check unique employees (if employee_id exists)
        unique_employees = set()
        for r in records:
            emp_id = r.get('employee_id')
            if emp_id:
                unique_employees.add(emp_id)
        if unique_employees:
            print(f"[Bonus ROI] Data from {len(unique_employees)} unique employees: {unique_employees}")
        else:
            print(f"[Bonus ROI] Note: employee_id field not found in records")
        
        if not records or len(records) == 0:
            return {
                "totalBonusesPaid": 0,
                "bonusAsPercentOfRevenue": 0,
                "bonusAsPercentOfGrossProfit": 0,
                "totalRevenue": 0,
                "totalGrossProfit": 0,
                "avgRevenuePerDay": 0,
                "avgJobsPerDay": 0,
                "avgProfitMargin": 0,
                "avgLER": 0,
                "avgBonusAmount": 0,
                "qualificationRate": 0,
                "bonusDaysCount": 0,
                "totalWorkDays": 0,
                "trends": [],
                "serviceProfitability": []
            }
        
        from datetime import datetime
        from collections import defaultdict
        
        # Calculate basic totals
        # Total bonuses = LER bonus (bonus_qualified_for_percent) + Appointment bonus (appointment_based_bonus)
        total_bonuses_paid = sum(
            r.get('bonus_qualified_for_percent', 0) + r.get('appointment_based_bonus', 0) 
            for r in records
        )
        total_base_pay = sum(r.get('employee_base_pay', 0) for r in records)
        total_revenue = sum(r.get('total_job_revenue', 0) for r in records)
        total_gross_profit = sum(r.get('gross_profit_before_bonus', 0) for r in records)
        
        # Bonus cost analysis
        bonus_as_percent_of_revenue = (total_bonuses_paid / total_revenue * 100) if total_revenue > 0 else 0
        bonus_as_percent_of_gross_profit = (total_bonuses_paid / total_gross_profit * 100) if total_gross_profit > 0 else 0
        
        # Performance metrics
        total_work_days = len(records)
        total_jobs = sum(r.get('number_of_jobs', 0) for r in records)
        avg_revenue_per_day = total_revenue / total_work_days if total_work_days > 0 else 0
        avg_jobs_per_day = total_jobs / total_work_days if total_work_days > 0 else 0
        avg_profit_margin = (total_gross_profit / total_revenue * 100) if total_revenue > 0 else 0
        
        # LER metrics
        total_ler = sum(r.get('ler', 0) for r in records)
        avg_ler = (total_ler / total_work_days) if total_work_days > 0 else 0
        
        # Bonus effectiveness
        bonus_days_count = sum(
            1 for r in records 
            if (r.get('bonus_qualified_for_percent', 0) + r.get('appointment_based_bonus', 0)) > 0
        )
        qualification_rate = (bonus_days_count / total_work_days * 100) if total_work_days > 0 else 0
        avg_bonus_amount = (total_bonuses_paid / bonus_days_count) if bonus_days_count > 0 else 0
        
        # Build trends over time (group by date)
        data_by_date = defaultdict(lambda: {
            'ler': [], 
            'revenue': [], 
            'jobs': [], 
            'profit': [],
            'bonuses': []
        })
        
        for r in records:
            date_str = r.get('date', '')
            if date_str:
                data_by_date[date_str]['ler'].append(r.get('ler', 0))
                data_by_date[date_str]['revenue'].append(r.get('total_job_revenue', 0))
                data_by_date[date_str]['jobs'].append(r.get('number_of_jobs', 0))
                data_by_date[date_str]['profit'].append(r.get('gross_profit_before_bonus', 0))
                bonus = r.get('bonus_qualified_for_percent', 0) + r.get('appointment_based_bonus', 0)
                data_by_date[date_str]['bonuses'].append(bonus)
        
        # Calculate trends
        trends = []
        for date_str in sorted(data_by_date.keys()):
            data = data_by_date[date_str]
            day_revenue = sum(data['revenue'])
            day_profit = sum(data['profit'])
            trends.append({
                "date": date_str,
                "avgLER": round(sum(data['ler']) / len(data['ler']), 2) if data['ler'] else 0,
                "totalRevenue": round(day_revenue, 2),
                "totalJobs": sum(data['jobs']),
                "avgRevenuePerTech": round(day_revenue / len(data['revenue']), 2) if data['revenue'] else 0,
                "avgJobsPerTech": round(sum(data['jobs']) / len(data['jobs']), 2) if data['jobs'] else 0,
                "profitMargin": round((day_profit / day_revenue * 100), 2) if day_revenue > 0 else 0,
                "totalBonuses": round(sum(data['bonuses']), 2)
            })
        
        # Calculate service-level bonus impact
        service_breakdown = defaultdict(lambda: {
            'revenue': 0,
            'jobs': 0,
            'gross_profit': 0,
            'bonuses': 0,
            'base_pay': 0
        })
        
        print(f"[Bonus ROI] Processing {len(records)} records for service breakdown")
        records_with_service_data = 0
        
        for r in records:
            # Get service breakdown from the record
            service_data = r.get('service_breakdown', {})
            if service_data and 'services' in service_data:
                records_with_service_data += 1
                total_record_revenue = r.get('total_job_revenue', 0)
                total_record_profit = r.get('gross_profit_before_bonus', 0)
                total_record_bonus = r.get('bonus_qualified_for_percent', 0) + r.get('appointment_based_bonus', 0)
                total_record_base_pay = r.get('employee_base_pay', 0)
                
                for service in service_data['services']:
                    service_name = service.get('serviceName', 'Unknown')
                    service_revenue = service.get('revenue', 0)
                    service_jobs = service.get('jobs', 0)
                    
                    # Allocate profit and bonuses proportionally by revenue
                    revenue_share = service_revenue / total_record_revenue if total_record_revenue > 0 else 0
                    
                    service_breakdown[service_name]['revenue'] += service_revenue
                    service_breakdown[service_name]['jobs'] += service_jobs
                    service_breakdown[service_name]['gross_profit'] += total_record_profit * revenue_share
                    service_breakdown[service_name]['bonuses'] += total_record_bonus * revenue_share
                    service_breakdown[service_name]['base_pay'] += total_record_base_pay * revenue_share
        
        print(f"[Bonus ROI] Found {records_with_service_data} records with service breakdown data")
        print(f"[Bonus ROI] Unique services found: {list(service_breakdown.keys())}")
        
        # Format service profitability data
        service_profitability = []
        for service_name, data in service_breakdown.items():
            revenue = data['revenue']
            gross_profit = data['gross_profit']
            bonuses = data['bonuses']
            base_pay = data['base_pay']
            jobs = data['jobs']
            
            # Calculate margins
            gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
            net_profit_after_bonus = gross_profit - bonuses
            net_margin_after_bonus = (net_profit_after_bonus / revenue * 100) if revenue > 0 else 0
            bonus_as_percent_of_revenue = (bonuses / revenue * 100) if revenue > 0 else 0
            bonus_as_percent_of_profit = (bonuses / gross_profit * 100) if gross_profit > 0 else 0
            
            # Per-job metrics
            avg_revenue_per_job = revenue / jobs if jobs > 0 else 0
            avg_bonus_per_job = bonuses / jobs if jobs > 0 else 0
            avg_profit_per_job = net_profit_after_bonus / jobs if jobs > 0 else 0
            
            service_profitability.append({
                "serviceName": service_name,
                "revenue": round(revenue, 2),
                "jobs": jobs,
                "grossProfit": round(gross_profit, 2),
                "grossMargin": round(gross_margin, 2),
                "totalBonuses": round(bonuses, 2),
                "netProfitAfterBonus": round(net_profit_after_bonus, 2),
                "netMarginAfterBonus": round(net_margin_after_bonus, 2),
                "bonusAsPercentOfRevenue": round(bonus_as_percent_of_revenue, 2),
                "bonusAsPercentOfProfit": round(bonus_as_percent_of_profit, 2),
                "avgRevenuePerJob": round(avg_revenue_per_job, 2),
                "avgBonusPerJob": round(avg_bonus_per_job, 2),
                "avgProfitPerJob": round(avg_profit_per_job, 2)
            })
        
        # Sort by net margin after bonus (descending)
        service_profitability.sort(key=lambda x: x['netMarginAfterBonus'], reverse=True)
        
        return {
            # Bonus Cost Analysis
            "totalBonusesPaid": round(total_bonuses_paid, 2),
            "bonusAsPercentOfRevenue": round(bonus_as_percent_of_revenue, 2),
            "bonusAsPercentOfGrossProfit": round(bonus_as_percent_of_gross_profit, 2),
            
            # Performance Metrics
            "totalRevenue": round(total_revenue, 2),
            "totalGrossProfit": round(total_gross_profit, 2),
            "avgRevenuePerDay": round(avg_revenue_per_day, 2),
            "avgJobsPerDay": round(avg_jobs_per_day, 2),
            "avgProfitMargin": round(avg_profit_margin, 2),
            "avgLER": round(avg_ler, 2),
            
            # Bonus Effectiveness
            "avgBonusAmount": round(avg_bonus_amount, 2),
            "qualificationRate": round(qualification_rate, 2),
            "bonusDaysCount": bonus_days_count,
            "totalWorkDays": total_work_days,
            
            # Trends
            "trends": trends,
            
            # Service-Level Bonus Impact
            "serviceProfitability": service_profitability
        }
        
    except Exception as e:
        print(f"[Bonus ROI] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error calculating bonus ROI: {str(e)}")
