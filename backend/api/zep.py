"""
Zep Cloud API endpoints - Backend proxy for memory operations
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Path
from supabase import create_client, Client
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import time
from logging_config import get_logger

# Import RAG metrics service
from services.ragMetricsService import (
    RetrievalMetrics, 
    get_config, 
    list_configs,
    calculate_tokens
)

def save_retrieval_metrics(metrics: RetrievalMetrics):
    """Save retrieval metrics to database"""
    try:
        supabase = get_supabase_client()
        if not supabase:
            logger.warning("Cannot save metrics: No Supabase client")
            return
        
        metrics_data = metrics.get_metrics()
        supabase.table('rag_retrieval_metrics').insert({
            'user_id': metrics.user_id,
            'query': metrics_data['query'],
            'retrieved_nodes': metrics_data['retrieved_nodes'],
            'retrieved_edges': metrics_data['retrieved_edges'],
            'context_tokens': metrics_data['context_tokens'],
            'retrieval_time_ms': metrics_data['retrieval_time_ms'],
            'completeness_score': metrics_data['completeness_score'],
            'similarity_threshold': metrics_data['similarity_threshold'],
            'max_results': metrics_data['max_results'],
            'response_length': metrics_data['response_length']
        }).execute()
        
        logger.info(f"✅ Saved RAG metrics for {metrics.user_id}")
    except Exception as e:
        logger.error(f"Failed to save RAG metrics: {e}")


def get_supabase_client() -> Client:
    """Get Supabase client for database queries"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            logger.warning("Supabase environment variables not configured")
            return None
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


def get_financial_context(user_id: str) -> Dict[str, Any]:
    """Get financial context data for a user from Supabase tables"""
    from datetime import datetime, timedelta
    
    supabase = get_supabase_client()
    if not supabase:
        logger.warning("No Supabase client available for financial context")
        return {}

    try:
        # Get current date info
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        current_date = now.strftime("%Y-%m-%d")
        
        financial_data = {}

        # Get historical revenue data (only completed months)
        try:
            # Only get data up to the previous month (completed data)
            # If current month has data, we'll include it but mark it as in-progress
            revenue_response = supabase.table('revenue_entries').select(
                'year, month, actual_revenue, desired_revenue'
            ).eq('user_id', user_id).order('year', desc=True).order('month', desc=True).execute()

            if revenue_response.data:
                # Filter out future months and organize by recency
                valid_revenue = []
                current_month_data = None
                
                for entry in revenue_response.data:
                    entry_year = entry['year']
                    entry_month = entry['month']
                    
                    # Skip future months
                    if entry_year > current_year or (entry_year == current_year and entry_month > current_month):
                        continue
                        
                    # Separate current month from historical
                    if entry_year == current_year and entry_month == current_month:
                        current_month_data = entry
                    else:
                        valid_revenue.append(entry)
                
                # Take last 6 completed months
                valid_revenue = valid_revenue[:6]
                
                financial_data['historical_revenue'] = valid_revenue
                financial_data['current_month_revenue'] = current_month_data
                financial_data['current_date_context'] = {
                    'current_year': current_year,
                    'current_month': current_month,
                    'current_date': current_date,
                    'is_current_month_complete': False  # We never have complete month data in real-time
                }
                
                logger.info(f"📊 Retrieved {len(valid_revenue)} historical revenue entries for {user_id}")
                if current_month_data:
                    logger.info(f"📊 Current month data: {current_month_data}")
        except Exception as e:
            logger.warning(f"Could not retrieve revenue data: {e}")

        # Get current KPIs (most recent, excluding future months)
        try:
            kpi_response = supabase.table('kpi_records').select(
                'year, month, kpi_type, kpi_value, goal_value'
            ).eq('user_id', user_id).order('year', desc=True).order('month', desc=True).execute()

            if kpi_response.data:
                # Filter out future months
                valid_kpis = []
                for kpi in kpi_response.data:
                    if kpi['year'] > current_year or (kpi['year'] == current_year and kpi['month'] > current_month):
                        continue
                    valid_kpis.append(kpi)
                
                financial_data['current_kpis'] = valid_kpis[:5]  # Most recent 5
                logger.info(f"📊 Retrieved {len(valid_kpis)} KPI records for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve KPI data: {e}")

        # Get employee LER data (recent, no future filtering needed for daily data)
        try:
            ler_response = supabase.table('employee_daily_records').select(
                'employee_id, work_day, ler, bonus'  # Fixed column name from work_date to work_day
            ).eq('user_id', user_id).order('work_day', desc=True).limit(10).execute()  # Reduced from 20

            if ler_response.data:
                financial_data['recent_ler'] = ler_response.data
                logger.info(f"📊 Retrieved {len(ler_response.data)} LER records for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve LER data: {e}")

        # Get historical year-over-year revenue data (multi-year for seasonal patterns)
        try:
            yoy_revenue_response = supabase.table('revenue_entries').select(
                'year, month, actual_revenue, desired_revenue'
            ).eq('user_id', user_id).gte('year', current_year - 4).order('year', desc=True).order('month', desc=True).execute()  # Last 5 years

            if yoy_revenue_response.data:
                # Filter out future months
                valid_yoy_revenue = []
                for entry in yoy_revenue_response.data:
                    entry_year = entry['year']
                    entry_month = entry['month']
                    # Skip future months
                    if entry_year > current_year or (entry_year == current_year and entry_month > current_month):
                        continue
                    valid_yoy_revenue.append(entry)
                
                financial_data['historical_yoy_revenue'] = valid_yoy_revenue
                logger.info(f"📊 Retrieved {len(valid_yoy_revenue)} historical year-over-year revenue entries for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve historical year-over-year revenue data: {e}")

        # Get historical year-over-year KPI data (multi-year trends)
        try:
            yoy_kpi_response = supabase.table('kpi_records').select(
                'year, month, kpi_type, kpi_value, goal_value'
            ).eq('user_id', user_id).gte('year', current_year - 4).order('year', desc=True).order('month', desc=True).execute()  # Last 5 years

            if yoy_kpi_response.data:
                # Filter out future months
                valid_yoy_kpis = []
                for kpi in yoy_kpi_response.data:
                    if kpi['year'] > current_year or (kpi['year'] == current_year and kpi['month'] > current_month):
                        continue
                    valid_yoy_kpis.append(kpi)
                
                financial_data['historical_yoy_kpis'] = valid_yoy_kpis
                logger.info(f"📊 Retrieved {len(valid_yoy_kpis)} historical year-over-year KPI entries for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve historical year-over-year KPI data: {e}")

        # Get top services by revenue over the last 90 days
        try:
            ninety_days_ago = now - timedelta(days=90)

            # Fetch recent service activities
            service_activities_response = supabase.table('service_activities').select(
                'service_id, week_start_date, total_revenue, appointment_count'
            ).eq('user_id', user_id).gte('week_start_date', ninety_days_ago.strftime('%Y-%m-%d')).execute()

            service_activities_data = service_activities_response.data or []

            if service_activities_data:
                # Aggregate revenue and appointments per service
                service_totals: Dict[str, Dict[str, Any]] = {}
                for activity in service_activities_data:
                    service_id = activity.get('service_id')
                    if not service_id:
                        continue

                    total_revenue = float(activity.get('total_revenue') or 0)
                    appointments = int(activity.get('appointment_count') or 0)

                    if service_id not in service_totals:
                        service_totals[service_id] = {
                            'service_id': service_id,
                            'total_revenue': 0.0,
                            'appointment_count': 0
                        }

                    service_totals[service_id]['total_revenue'] += total_revenue
                    service_totals[service_id]['appointment_count'] += appointments

                if service_totals:
                    # Fetch service metadata (names, categories, colors)
                    service_ids = list(service_totals.keys())
                    services_response = supabase.table('services').select(
                        'id, service_name, service_category, color'
                    ).eq('user_id', user_id).in_('id', service_ids).execute()

                    services_data = services_response.data or []
                    service_meta = {s['id']: s for s in services_data}

                    # Build enriched list and sort by revenue
                    enriched = []
                    for service_id, totals in service_totals.items():
                        meta = service_meta.get(service_id, {})
                        enriched.append({
                            'service_id': service_id,
                            'service_name': meta.get('service_name', 'Unknown Service'),
                            'service_category': meta.get('service_category'),
                            'color': meta.get('color'),
                            'total_revenue': totals['total_revenue'],
                            'appointment_count': totals['appointment_count'],
                        })

                    # Sort by total revenue descending and take top 3
                    enriched.sort(key=lambda s: s['total_revenue'], reverse=True)
                    top_services = enriched[:3]

                    financial_data['top_services_last_90_days'] = top_services
                    logger.info(
                        f"📊 Computed top {len(top_services)} services for last 90 days for {user_id}"
                    )
        except Exception as e:
            logger.warning(f"Could not retrieve top services for last 90 days: {e}")

        # Get upcoming FIR targets (next 2 months of desired_revenue)
        try:
            def add_month(year: int, month: int, delta: int) -> tuple[int, int]:
                new_month = month + delta
                new_year = year + (new_month - 1) // 12
                new_month = ((new_month - 1) % 12) + 1
                return new_year, new_month

            next1_year, next1_month = add_month(current_year, current_month, 1)
            next2_year, next2_month = add_month(current_year, current_month, 2)

            years_to_check = list({current_year, next1_year, next2_year})

            fir_response = supabase.table('revenue_entries').select(
                'year, month, desired_revenue'
            ).eq('user_id', user_id).in_('year', years_to_check).execute()

            fir_data = fir_response.data or []
            upcoming_targets = []
            for entry in fir_data:
                year = entry.get('year')
                month = entry.get('month')
                desired_revenue = entry.get('desired_revenue')
                if desired_revenue is None:
                    continue

                if (year, month) in [(next1_year, next1_month), (next2_year, next2_month)]:
                    upcoming_targets.append({
                        'year': year,
                        'month': month,
                        'desired_revenue': float(desired_revenue),
                    })

            if upcoming_targets:
                # Sort by year/month ascending
                upcoming_targets.sort(key=lambda e: (e['year'], e['month']))
                financial_data['upcoming_fir_targets'] = upcoming_targets
                logger.info(
                    f"📊 Retrieved {len(upcoming_targets)} upcoming FIR targets for next 2 months for {user_id}"
                )
        except Exception as e:
            logger.warning(f"Could not retrieve upcoming FIR targets: {e}")

        # Get historical year-over-year LER data (performance patterns)
        try:
            yoy_ler_response = supabase.table('employee_daily_records').select(
                'employee_id, work_day, ler, bonus'
            ).eq('user_id', user_id).gte('work_day', f'{current_year - 4}-01-01').order('work_day', desc=True).limit(50).execute()  # Last 5 years, approx 50 entries

            if yoy_ler_response.data:
                financial_data['historical_yoy_ler'] = yoy_ler_response.data
                logger.info(f"📊 Retrieved {len(yoy_ler_response.data)} historical year-over-year LER entries for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve historical year-over-year LER data: {e}")

        # Get Lighthouse goal and plan data
        try:
            lighthouse_data = {}
            
            # Get Lighthouse goal (includes story in notes field)
            goal_response = supabase.table('big_fig_goals').select(
                'target_annual_revenue, target_year, target_month, years_to_goal, notes, plan_status'
            ).eq('user_id', user_id).limit(1).execute()
            
            if goal_response.data:
                goal = goal_response.data[0]
                lighthouse_data['goal'] = {
                    'target_annual_revenue': float(goal.get('target_annual_revenue') or 0),
                    'target_year': goal.get('target_year'),
                    'target_month': goal.get('target_month'),
                    'years_to_goal': goal.get('years_to_goal'),
                    'story': goal.get('notes'),  # The Lighthouse story is stored in notes
                    'plan_status': goal.get('plan_status', 'draft')
                }
                
                # Calculate current step year (which year of the plan are we in?)
                if goal.get('years_to_goal') and goal.get('target_year'):
                    start_year = goal['target_year'] - goal['years_to_goal']
                    current_step_year = max(1, min(current_year - start_year + 1, goal['years_to_goal']))
                    lighthouse_data['current_step_year'] = current_step_year
                
                logger.info(f"📊 Retrieved Lighthouse goal for {user_id}")
            
            # Get step overrides (themes and milestones)
            overrides_response = supabase.table('lighthouse_step_overrides').select(
                'year_index, year_label, target_revenue, theme_index, milestones, approved'
            ).eq('user_id', user_id).order('year_index').execute()
            
            if overrides_response.data:
                lighthouse_data['step_overrides'] = overrides_response.data
                
                # Extract current year's milestones for easy access
                current_step_idx = lighthouse_data.get('current_step_year', 1) - 1
                current_override = next(
                    (o for o in overrides_response.data if o.get('year_index') == current_step_idx),
                    None
                )
                if current_override:
                    lighthouse_data['current_year_milestones'] = current_override.get('milestones', [])
                    lighthouse_data['current_year_theme_index'] = current_override.get('theme_index')
                
                logger.info(f"📊 Retrieved {len(overrides_response.data)} Lighthouse step overrides for {user_id}")
            
            if lighthouse_data:
                financial_data['lighthouse'] = lighthouse_data
                
        except Exception as e:
            logger.warning(f"Could not retrieve Lighthouse data: {e}")

        # Get employee data (names, positions, pay rates)
        try:
            employees_response = supabase.table('employee_info').select(
                'id, name, position, current_base_rate'
            ).eq('user_id', user_id).order('name').execute()
            
            if employees_response.data:
                employees = []
                for emp in employees_response.data:
                    employees.append({
                        'id': emp.get('id'),
                        'name': emp.get('name'),
                        'position': emp.get('position'),
                        'hourly_rate': float(emp.get('current_base_rate') or 0)
                    })
                financial_data['employees'] = employees
                logger.info(f"📊 Retrieved {len(employees)} employees for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve employee data: {e}")

        # Get recent employee performance (last 30 days of daily records with employee names)
        try:
            thirty_days_ago = (now - timedelta(days=30)).strftime('%Y-%m-%d')
            
            # Get daily records
            records_response = supabase.table('employee_daily_records').select(
                'employee_id, work_day, ler, number_of_jobs, total_job_revenue, total_employee_pay, qualify_for_bonus, bonus_qualified_for_percent'
            ).eq('user_id', user_id).gte('work_day', thirty_days_ago).order('work_day', desc=True).execute()
            
            if records_response.data and financial_data.get('employees'):
                # Create employee lookup
                emp_lookup = {emp['id']: emp['name'] for emp in financial_data['employees']}
                
                # Aggregate by employee
                emp_performance: Dict[str, Dict[str, Any]] = {}
                for record in records_response.data:
                    emp_id = record.get('employee_id')
                    emp_name = emp_lookup.get(emp_id, 'Unknown')
                    
                    if emp_id not in emp_performance:
                        emp_performance[emp_id] = {
                            'employee_id': emp_id,
                            'name': emp_name,
                            'days_worked': 0,
                            'total_jobs': 0,
                            'total_revenue': 0,
                            'total_pay': 0,
                            'avg_ler': [],
                            'bonus_days': 0
                        }
                    
                    emp_performance[emp_id]['days_worked'] += 1
                    emp_performance[emp_id]['total_jobs'] += int(record.get('number_of_jobs') or 0)
                    emp_performance[emp_id]['total_revenue'] += float(record.get('total_job_revenue') or 0)
                    emp_performance[emp_id]['total_pay'] += float(record.get('total_employee_pay') or 0)
                    if record.get('ler'):
                        emp_performance[emp_id]['avg_ler'].append(float(record.get('ler')))
                    if record.get('qualify_for_bonus'):
                        emp_performance[emp_id]['bonus_days'] += 1
                
                # Calculate averages
                for emp_id, perf in emp_performance.items():
                    if perf['avg_ler']:
                        perf['avg_ler'] = round(sum(perf['avg_ler']) / len(perf['avg_ler']), 2)
                    else:
                        perf['avg_ler'] = None
                    perf['total_revenue'] = round(perf['total_revenue'], 2)
                    perf['total_pay'] = round(perf['total_pay'], 2)
                
                financial_data['employee_performance_30d'] = list(emp_performance.values())
                logger.info(f"📊 Retrieved 30-day performance for {len(emp_performance)} employees for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve employee performance data: {e}")

        # Get services (what services does this business offer)
        try:
            services_response = supabase.table('services').select(
                'id, service_name, service_category, base_price, cogs_cost, is_active'
            ).eq('user_id', user_id).eq('is_active', True).execute()
            
            if services_response.data:
                services = []
                for svc in services_response.data:
                    services.append({
                        'id': svc.get('id'),
                        'name': svc.get('service_name'),
                        'category': svc.get('service_category'),
                        'base_price': float(svc.get('base_price') or 0),
                        'cogs_cost': float(svc.get('cogs_cost') or 0)
                    })
                financial_data['services'] = services
                logger.info(f"📊 Retrieved {len(services)} services for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve services data: {e}")

        # Get company settings (bonus rules, overhead, pay schedule)
        try:
            settings_response = supabase.table('company_settings').select(
                'overhead_percent, bonus_threshold_min, bonus_threshold_max, '
                'overtime_hours_daily, overtime_multiplier, pay_schedule, '
                'enable_appointment_bonus, appointment_bonus_3_jobs, appointment_bonus_4_jobs, '
                'appointment_bonus_5_jobs, appointment_bonus_6_plus_jobs, '
                'number_of_crews, employees_per_crew, monthly_crew_capacity'
            ).eq('user_id', user_id).limit(1).execute()
            
            if settings_response.data:
                settings = settings_response.data[0]
                financial_data['company_settings'] = {
                    'overhead_percent': float(settings.get('overhead_percent') or 32),
                    'bonus_threshold_min': float(settings.get('bonus_threshold_min') or 25),
                    'bonus_threshold_max': float(settings.get('bonus_threshold_max') or 100),
                    'overtime_hours_daily': float(settings.get('overtime_hours_daily') or 12),
                    'overtime_multiplier': float(settings.get('overtime_multiplier') or 1.5),
                    'pay_schedule': settings.get('pay_schedule', 'bi-weekly'),
                    'appointment_bonus_enabled': settings.get('enable_appointment_bonus', True),
                    'appointment_bonus_3_jobs': float(settings.get('appointment_bonus_3_jobs') or 7),
                    'appointment_bonus_4_jobs': float(settings.get('appointment_bonus_4_jobs') or 10),
                    'appointment_bonus_5_jobs': float(settings.get('appointment_bonus_5_jobs') or 15),
                    'appointment_bonus_6_plus_jobs': float(settings.get('appointment_bonus_6_plus_jobs') or 20),
                    'number_of_crews': int(settings.get('number_of_crews') or 0),
                    'employees_per_crew': int(settings.get('employees_per_crew') or 0),
                    'monthly_crew_capacity': float(settings.get('monthly_crew_capacity') or 0)
                }
                logger.info(f"📊 Retrieved company settings for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve company settings: {e}")

        # Get bonus rules (custom LER-based bonus tiers)
        try:
            bonus_rules_response = supabase.table('bonus_rules').select(
                'id, name, min_ler, max_ler, bonus_percent, is_active'
            ).eq('user_id', user_id).eq('is_active', True).order('min_ler').execute()
            
            if bonus_rules_response.data:
                bonus_rules = []
                for rule in bonus_rules_response.data:
                    bonus_rules.append({
                        'name': rule.get('name'),
                        'min_ler': float(rule.get('min_ler') or 0),
                        'max_ler': float(rule.get('max_ler') or 0),
                        'bonus_percent': float(rule.get('bonus_percent') or 0)
                    })
                financial_data['bonus_rules'] = bonus_rules
                logger.info(f"📊 Retrieved {len(bonus_rules)} bonus rules for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve bonus rules: {e}")

        # Get pay periods (recent ones for context)
        try:
            pay_periods_response = supabase.table('pay_periods').select(
                'id, period_name, start_date, end_date, year'
            ).eq('user_id', user_id).order('start_date', desc=True).limit(5).execute()
            
            if pay_periods_response.data:
                financial_data['recent_pay_periods'] = pay_periods_response.data
                logger.info(f"📊 Retrieved {len(pay_periods_response.data)} recent pay periods for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve pay periods: {e}")

        return financial_data

    except Exception as e:
        logger.error(f"Error retrieving financial context for {user_id}: {e}")
        return {}


def build_business_profile(user_id: str) -> Dict[str, Any]:
    """Build a compact business profile for a user from Supabase data.

    This is intentionally lightweight and only uses a few high-value fields so that
    we can mirror stable business context into Zep's graph without introducing a
    new source of truth.
    """
    profile: Dict[str, Any] = {
        "version": 1,
        "user_id": user_id,
    }

    supabase = get_supabase_client()
    if not supabase:
        logger.warning("No Supabase client available for business profile")
        return profile

    try:
        # Company settings: pay schedule (already stored in company_settings)
        try:
            settings_response = (
                supabase.table("company_settings")
                .select("pay_schedule")
                .eq("user_id", user_id)
                .execute()
            )
            settings_rows = settings_response.data or []
            if settings_rows:
                settings = settings_rows[0]
                pay_schedule = settings.get("pay_schedule")
                if pay_schedule:
                    profile["pay_schedule"] = pay_schedule
        except Exception as e:
            logger.warning(
                f"Could not retrieve company settings for business profile: {e}"
            )

        # Employee count: how many employees exist for this user
        try:
            employees_response = (
                supabase.table("employee_info")
                .select("id")
                .eq("user_id", user_id)
                .execute()
            )
            employees = employees_response.data or []
            if employees:
                profile["approx_employee_count"] = len(employees)
        except Exception as e:
            logger.warning(
                f"Could not retrieve employee info for business profile: {e}"
            )

        # Approximate annual revenue band from the last 12 months of revenue_entries
        try:
            from datetime import datetime

            now = datetime.now()
            current_year = now.year
            current_month = now.month

            revenue_response = (
                supabase.table("revenue_entries")
                .select("year, month, actual_revenue")
                .eq("user_id", user_id)
                .gte("year", current_year - 1)
                .order("year", desc=True)
                .order("month", desc=True)
                .execute()
            )

            rows = revenue_response.data or []
            total_revenue = 0.0

            for entry in rows:
                year = entry.get("year")
                month = entry.get("month")
                if year is None or month is None:
                    continue

                # Skip future months
                if year > current_year or (year == current_year and month > current_month):
                    continue

                # Only include last 12 months
                months_diff = (current_year - year) * 12 + (current_month - month)
                if 0 <= months_diff < 12:
                    value = entry.get("actual_revenue")
                    if value is not None:
                        try:
                            total_revenue += float(value)
                        except Exception:
                            continue

            if total_revenue > 0:
                if total_revenue < 250_000:
                    band = "<250k"
                elif total_revenue < 1_000_000:
                    band = "250k-1M"
                elif total_revenue < 3_000_000:
                    band = "1-3M"
                else:
                    band = "3M+"

                profile["approx_annual_revenue_band"] = band
        except Exception as e:
            logger.warning(
                f"Could not compute revenue band for business profile: {e}"
            )

    except Exception as e:
        logger.error(f"Unexpected error building business profile for {user_id}: {e}")

    return profile


def sync_business_profile_to_zep(
    client: Any, user_id: str, facts: Optional[Dict[str, Any]] = None
) -> None:
    """Push a compact business profile into the user's Zep graph.

    This is best-effort only. Any errors are logged and do not affect the
    main context endpoint behavior.
    """
    try:
        profile = build_business_profile(user_id)

        # If Zep has extracted or we have inferred a business name, include it
        if facts:
            business_name = (
                facts.get("businessName")
                or facts.get("business_name")
                or facts.get("business")
            )
            if business_name:
                profile["business_name"] = business_name

        # If we only have version/user_id, there's nothing useful to sync
        if len(profile.keys()) <= 2:
            logger.info(
                f"Business profile for {user_id} is empty; skipping Zep graph sync"
            )
            return

        graph = getattr(client, "graph", None)
        if graph is None or not hasattr(graph, "add"):
            logger.warning("Zep client does not expose graph.add; skipping profile sync")
            return

        data_str = json.dumps(profile)
        graph.add(
            user_id=user_id,
            type="json",
            data=data_str,
        )
        logger.info(f"📈 Synced business profile to Zep graph for {user_id}")

    except Exception as e:
        logger.warning(
            f"Could not sync business profile to Zep graph for {user_id}: {e}"
        )

logger = get_logger(__name__)

router = APIRouter(prefix="/api/zep", tags=["zep"])

# Zep Cloud client (lazy initialization)
_zep_client = None

def get_zep_client():
    """Get or initialize Zep Cloud client"""
    global _zep_client
    
    if _zep_client is None:
        try:
            from zep_cloud.client import Zep
            
            api_key = os.getenv("ZEP_API_KEY")
            if not api_key:
                logger.warning("ZEP_API_KEY not configured")
                return None
            
            _zep_client = Zep(api_key=api_key)
            logger.info("✅ Zep Cloud client initialized")
        except ImportError:
            logger.error("zep-cloud package not installed. Run: pip install zep-cloud")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Zep client: {e}")
            return None
    
    return _zep_client


# Request/Response Models
class ZepMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    metadata: Optional[Dict[str, Any]] = None


class AddMessagesRequest(BaseModel):
    userId: str
    messages: List[ZepMessage]
    userEmail: Optional[str] = None
    userFirstName: Optional[str] = None
    userLastName: Optional[str] = None


class GetContextRequest(BaseModel):
    userId: str
    lastN: Optional[int] = 10


class ZepContextResponse(BaseModel):
    context: str
    recentMessages: List[Dict[str, Any]]
    relevantMemories: List[Dict[str, Any]]
    facts: Dict[str, Any]
    financialContext: Optional[Dict[str, Any]] = {}


# Endpoints
@router.post("/messages")
async def add_messages(request: AddMessagesRequest):
    """
    Add messages to a user's thread in Zep Cloud
    """
    client = get_zep_client()
    if not client:
        return {
            "success": False,
            "error": "Zep not configured"
        }
    
    try:
        # Ensure user exists first (required by Zep Cloud)
        # Per Zep docs: provide firstName and lastName for better user association
        try:
            client.user.add(
                user_id=request.userId,
                email=request.userEmail or f"{request.userId}@app.local",
                first_name=request.userFirstName or "User",
                last_name=request.userLastName or "Account"
            )
            logger.info(f"👤 Created user {request.userId}")
        except Exception as user_error:
            # User might already exist, that's okay
            error_msg = str(user_error).lower()
            if "already exists" not in error_msg and "duplicate" not in error_msg:
                logger.debug(f"User creation note: {user_error}")
        
        # Ensure thread exists (create if not)
        # Using userId as threadId for simplicity (one thread per user)
        try:
            client.thread.create(
                thread_id=request.userId,
                user_id=request.userId
            )
            logger.info(f"📝 Created thread for user {request.userId}")
        except Exception as create_error:
            # Thread might already exist, that's okay
            error_msg = str(create_error).lower()
            if "already exists" not in error_msg and "duplicate" not in error_msg:
                logger.debug(f"Thread creation note: {create_error}")
        
        # Convert messages to Zep format
        # Per Zep docs: include 'name' field to help with graph construction
        user_name = f"{request.userFirstName or 'User'} {request.userLastName or 'Account'}".strip()
        
        zep_messages = [
            {
                "role": msg.role,
                "content": msg.content,
                "name": user_name if msg.role == "user" else "AI Assistant",
                "metadata": msg.metadata or {}
            }
            for msg in request.messages
        ]
        
        # Add messages to thread (thread ID = user ID)
        response = client.thread.add_messages(
            thread_id=request.userId,
            messages=zep_messages
        )
        
        logger.info(f"💾 Saved {len(request.messages)} messages for user {request.userId}")
        
        return {
            "success": True,
            "messageCount": len(request.messages)
        }
        
    except Exception as e:
        logger.error(f"Error adding messages to Zep: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/context/{user_id}")
async def get_context(user_id: str, lastN: int = 10, config: str = "balanced"):
    """
    Get conversation context for a user from Zep Cloud
    """
    # Force logging to appear - MULTIPLE METHODS
    import sys
    print(f"\n{'='*60}", flush=True)
    print(f"🔍 ENDPOINT CALLED: Getting context for user {user_id}", flush=True)
    print(f"📊 Using config: {config}", flush=True)
    print(f"{'='*60}\n", flush=True)
    sys.stdout.flush()
    logger.info(f"🔍 Getting context for user {user_id}")
    logger.info(f"📊 Using retrieval config: {config}")
    logger.warning(f"⚠️ CONTEXT ENDPOINT HIT FOR {user_id}")
    
    # Initialize metrics tracking
    metrics = RetrievalMetrics(user_id)
    retrieval_start = time.time()
    
    # Get retrieval configuration
    retrieval_config = get_config(config)
    metrics.set_parameters(
        retrieval_config['similarity_threshold'],
        retrieval_config['max_results']
    )
    
    client = get_zep_client()
    if not client:
        print("⚠️ Zep client not available", flush=True)
        logger.warning("⚠️ Zep client not available")
        return {
            "context": "",
            "recentMessages": [],
            "relevantMemories": [],
            "facts": {},
            "_debug": "no_zep_client"
        }
    
    try:
        # Get user context using getUserContext method (per Zep docs)
        user_context = client.thread.get_user_context(
            thread_id=user_id
        )
        
        # Log what we received for debugging
        logger.info(f"📊 Zep context retrieved for {user_id}")
        logger.debug(f"Context object: {user_context}")
        
        # Get recent messages
        # NOTE: The Python SDK example shows only thread_id; lastN/last_n are not
        # accepted keyword args in this version, so we let Zep return its
        # default window and, if needed, slice messages on our side.
        messages_response = client.thread.get(
            thread_id=user_id
        )
        messages = getattr(messages_response, 'messages', []) or []
        
        # Extract context string (this contains the graph data)
        context_string = getattr(user_context, 'context', '')
        logger.info(f"📝 Context string length: {len(context_string)} chars")
        if context_string:
            logger.debug(f"Context preview: {context_string[:200]}...")
        
        # Calculate retrieval timing
        retrieval_time_ms = int((time.time() - retrieval_start) * 1000)
        metrics.set_timing(retrieval_time_ms)
        
        # Set retrieval metrics
        # Note: Zep doesn't expose nodes/edges count in current SDK version
        # We'll estimate based on context length
        estimated_nodes = min(50, len(context_string) // 100)  # Rough estimate
        estimated_edges = min(20, len(context_string) // 200)  # Rough estimate
        metrics.set_retrieval_results([{} for _ in range(estimated_nodes)], 
                                   [{} for _ in range(estimated_edges)], 
                                   context_string)
        
        # Format facts as dict
        facts = {}
        if hasattr(user_context, 'facts') and user_context.facts:
            logger.info(f"📌 Found {len(user_context.facts)} facts")
            for fact in user_context.facts:
                fact_name = getattr(fact, 'name', 'unknown')
                fact_value = getattr(fact, 'value', None)
                facts[fact_name] = fact_value
                logger.debug(f"  - {fact_name}: {fact_value}")

        # If Zep did not provide a structured businessName fact, try to infer it
        # from recent user messages (e.g., "My business name is Clearview Windows").
        if "businessName" not in facts:
            inferred_name = None
            for msg in reversed(messages):
                try:
                    role = getattr(msg, "role", None) or msg.get("role")
                    content = getattr(msg, "content", None) or msg.get("content")
                except AttributeError:
                    continue

                if not content:
                    continue

                # Only consider user-facing messages
                if role not in ["user", "norole", None]:
                    continue

                text = str(content).strip()
                lower = text.lower()

                patterns = [
                    "my business name is ",
                    "the business name is ",
                    "our business name is ",
                    "the business is called ",
                    "my company name is ",
                ]

                for p in patterns:
                    idx = lower.find(p)
                    if idx != -1:
                        candidate = text[idx + len(p):].strip()
                        # Trim trailing punctuation
                        candidate = candidate.strip(" .!?,\"'")
                        if candidate:
                            inferred_name = candidate
                        break

                if inferred_name:
                    break

            if inferred_name:
                facts["businessName"] = inferred_name
                logger.info(f"🧠 Inferred businessName from messages: {inferred_name}")
        
        # Get financial context data
        financial_context = get_financial_context(user_id)

        # Best-effort: sync a compact business profile into Zep's graph so that
        # long-lived business facts are available at the graph level as well.
        sync_business_profile_to_zep(client, user_id, facts)

        result = {
            "context": context_string,
            "recentMessages": messages,
            "relevantMemories": getattr(user_context, 'facts', []),
            "facts": facts,
            "financialContext": financial_context,
            "_debug": "success",
            "metrics": {
                "retrieved_nodes": metrics.metrics['retrieved_nodes'],
                "retrieved_edges": metrics.metrics['retrieved_edges'],
                "context_tokens": metrics.metrics['context_tokens'],
                "retrieval_time_ms": metrics.metrics['retrieval_time_ms'],
                "config": {
                    "name": config,
                    "description": retrieval_config['description'],
                    "similarity_threshold": metrics.metrics['similarity_threshold'],
                    "max_results": metrics.metrics['max_results']
                }
            }
        }
        
        # Log metrics
        metrics.log_metrics()
        
        # Save metrics to database (async, non-blocking)
        save_retrieval_metrics(metrics)
        
        print(f"✅ Returning context: {len(context_string)} chars, {len(facts)} facts", flush=True)
        return result
        
    except Exception as e:
        print(f"❌ ERROR in get_context: {e}", flush=True)
        logger.error(f"Error getting context from Zep: {e}")
        import traceback
        traceback.print_exc()
        return {
            "context": "",
            "recentMessages": [],
            "relevantMemories": [],
            "facts": {},
            "_debug": f"error: {str(e)}"
        }


@router.get("/messages/{user_id}")
async def get_messages(user_id: str, lastN: int = 10):
    """
    Get recent messages for a user from Zep Cloud
    """
    client = get_zep_client()
    if not client:
        return {"messages": []}
    
    try:
        response = client.thread.get(
            thread_id=user_id,
            lastN=lastN
        )
        
        return {
            "messages": getattr(response, 'messages', [])
        }
        
    except Exception as e:
        logger.error(f"Error getting messages from Zep: {e}")
        return {"messages": []}


@router.delete("/thread/{user_id}")
async def delete_thread(user_id: str):
    """
    Delete a user's thread (clear memory)
    """
    client = get_zep_client()
    if not client:
        return {
            "success": False,
            "error": "Zep not configured"
        }
    
    try:
        client.thread.delete(thread_id=user_id)
        logger.info(f"🗑️ Deleted thread for user {user_id}")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error deleting thread from Zep: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/metrics/{user_id}")
async def get_retrieval_metrics(user_id: str, limit: int = 50):
    """
    Get RAG retrieval metrics for a user
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not available")
        
        response = supabase.table('rag_retrieval_metrics').select(
            '*'
        ).eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
        
        metrics = response.data or []
        
        # Calculate aggregates
        if metrics:
            avg_time = sum(m['retrieval_time_ms'] for m in metrics) / len(metrics)
            avg_tokens = sum(m['context_tokens'] for m in metrics) / len(metrics)
            completeness_counts = {}
            for m in metrics:
                score = m.get('completeness_score', 'unknown')
                completeness_counts[score] = completeness_counts.get(score, 0) + 1
            
            return {
                "metrics": metrics,
                "summary": {
                    "total_queries": len(metrics),
                    "avg_retrieval_time_ms": round(avg_time, 2),
                    "avg_context_tokens": round(avg_tokens, 2),
                    "completeness_distribution": completeness_counts
                }
            }
        
        return {"metrics": [], "summary": {}}
        
    except Exception as e:
        logger.error(f"Error retrieving metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/configs")
async def get_retrieval_configs():
    """
    Get available retrieval configurations
    """
    return {"configs": list_configs()}


@router.get("/health")
async def zep_health():
    """
    Check if Zep is configured and accessible
    """
    client = get_zep_client()
    
    return {
        "configured": client is not None,
        "apiKey": "present" if os.getenv("ZEP_API_KEY") else "missing"
    }
