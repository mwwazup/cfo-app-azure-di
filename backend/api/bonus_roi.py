"""
Bonus ROI Analysis API
Calculates return on investment for employee bonus structures
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from api.auth import get_supabase_db, get_current_user, User
from logging_config import get_logger

bonus_roi_router = APIRouter()
logger = get_logger(__name__)

@bonus_roi_router.get("/api/bonus-roi-analysis")
async def get_bonus_roi_analysis(
    year: int = Query(..., description="Year to analyze"),
    month: Optional[int] = Query(None, description="Specific month (1-12), omit for YTD"),
    current_user: User = Depends(get_current_user)
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
        userId = current_user.id
        logger.info(f"Bonus ROI analysis requested - user={userId}, year={year}, month={month}")
        supabase = get_supabase_db()
        
        # Get pay periods for this user and year
        # Note: We get ALL pay periods for the year, then filter records by date (not by pay period start_date)
        # This handles cross-month pay periods correctly (e.g., April 26 - May 10)
        pay_periods_result = supabase.table('pay_periods').select('id, start_date, end_date, year').eq('user_id', userId).eq('year', year).execute()
        all_pay_periods = pay_periods_result.data or []
        pay_period_ids = [pp['id'] for pp in all_pay_periods]
        
        logger.debug(f"Found {len(pay_period_ids)} pay periods for year {year}")
        
        if not pay_period_ids:
            logger.info(f"No pay periods found for user {userId}, year {year}")
            records = []
        else:
            # Get all daily records for these pay periods
            records_result = supabase.table('employee_daily_records').select('*').in_('pay_period_id', pay_period_ids).execute()
            all_records = records_result.data or []
            
            # Filter by month if specified (using actual record date, not pay period start_date)
            # This matches the Employee LER page filtering logic
            if month:
                from datetime import datetime
                records = []
                logger.debug(f"Filtering {len(all_records)} records for month {month}")
                for r in all_records:
                    record_date = datetime.fromisoformat(r['date'].replace('Z', '+00:00'))
                    if record_date.month == month:
                        records.append(r)
                logger.debug(f"After date filtering: {len(records)} records match month {month}")
            else:
                records = all_records
        
        logger.debug(f"Processing {len(records)} daily records")
        
        # Debug: Check unique employees and dates
        unique_employees = set()
        unique_dates = set()
        for r in records:
            emp_id = r.get('employee_id')
            if emp_id:
                unique_employees.add(emp_id)
            date = r.get('date')
            if date:
                unique_dates.add(date)
        
        if unique_employees:
            logger.debug(f"Data from {len(unique_employees)} unique employees")
        
        if unique_dates:
            logger.debug(f"Date range: {min(unique_dates)} to {max(unique_dates)}, {len(unique_dates)} unique dates")
        
        if not records or len(records) == 0:
            return {
                "totalBonusesPaid": 0,
                "bonusAsPercentOfRevenue": 0,
                "bonusAsPercentOfGrossProfit": 0,
                "totalRevenue": 0,
                "totalGrossProfit": 0,
                "netProfitAfterBonuses": 0,
                "profitMarginAfterBonuses": 0,
                "totalEmployeeDays": 0,
                "uniqueWorkDates": 0,
                "avgRevenuePerEmployeeDay": 0,
                "avgJobsPerEmployeeDay": 0,
                "avgProfitMargin": 0,
                "avgLER": 0,
                "totalHours": 0,
                "avgHourlyRateWithBonuses": 0,
                "avgBonusAmount": 0,
                "bonusDaysCount": 0,
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
        
        logger.debug(f"Totals - Bonuses: ${total_bonuses_paid:.2f}, Revenue: ${total_revenue:.2f}, Profit: ${total_gross_profit:.2f}")
        
        # Bonus cost analysis
        bonus_as_percent_of_revenue = (total_bonuses_paid / total_revenue * 100) if total_revenue > 0 else 0
        bonus_as_percent_of_gross_profit = (total_bonuses_paid / total_gross_profit * 100) if total_gross_profit > 0 else 0
        
        # Performance metrics
        # Note: total_work_days is actually "employee-days" (each employee's day is counted separately)
        total_employee_days = len(records)
        unique_dates = len(set(r.get('date', '') for r in records if r.get('date')))
        total_jobs = sum(r.get('number_of_jobs', 0) for r in records)
        total_hours = sum(r.get('total_hours_worked', 0) for r in records)
        
        # Per employee-day metrics (average across all employee working days)
        avg_revenue_per_employee_day = total_revenue / total_employee_days if total_employee_days > 0 else 0
        avg_jobs_per_employee_day = total_jobs / total_employee_days if total_employee_days > 0 else 0
        avg_profit_margin = (total_gross_profit / total_revenue * 100) if total_revenue > 0 else 0
        
        # Profit after bonuses
        net_profit_after_bonuses = total_gross_profit - total_bonuses_paid
        profit_margin_after_bonuses = (net_profit_after_bonuses / total_revenue * 100) if total_revenue > 0 else 0
        
        # LER metrics (averaged across all employee working days)
        total_ler = sum(r.get('ler', 0) for r in records)
        avg_ler = (total_ler / total_employee_days) if total_employee_days > 0 else 0
        
        # Compensation metrics
        total_employee_pay = total_base_pay + total_bonuses_paid
        avg_hourly_rate_with_bonuses = (total_employee_pay / total_hours) if total_hours > 0 else 0
        
        # Bonus effectiveness
        bonus_days_count = sum(
            1 for r in records 
            if (r.get('bonus_qualified_for_percent', 0) + r.get('appointment_based_bonus', 0)) > 0
        )
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
        
        logger.debug(f"Processing {len(records)} records for service breakdown")
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
        
        logger.debug(f"Found {records_with_service_data} records with service breakdown data")
        logger.debug(f"Unique services found: {len(service_breakdown)} services")
        
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
            "netProfitAfterBonuses": round(net_profit_after_bonuses, 2),
            "profitMarginAfterBonuses": round(profit_margin_after_bonuses, 2),
            "totalEmployeeDays": total_employee_days,
            "uniqueWorkDates": unique_dates,
            "avgRevenuePerEmployeeDay": round(avg_revenue_per_employee_day, 2),
            "avgJobsPerEmployeeDay": round(avg_jobs_per_employee_day, 2),
            "avgProfitMargin": round(avg_profit_margin, 2),
            "avgLER": round(avg_ler, 2),
            
            # Compensation Metrics
            "totalHours": round(total_hours, 2),
            "avgHourlyRateWithBonuses": round(avg_hourly_rate_with_bonuses, 2),
            "avgBonusAmount": round(avg_bonus_amount, 2),
            "bonusDaysCount": bonus_days_count,
            
            # Trends
            "trends": trends,
            
            # Service-Level Bonus Impact
            "serviceProfitability": service_profitability
        }
        
    except Exception as e:
        logger.error(f"Error calculating bonus ROI: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
