# 🚨 DATA LOSS RECOVERY PLAN

## What Happened (November 2, 2025)

**All data was deleted** from these tables:
- ✅ `revenue_entries` - WIPED CLEAN
- ✅ `kpi_records` - WIPED CLEAN
- ⚠️ Other tables may also be affected

**Cause**: Migration `09_fix_revenue_kpi_user_id.sql` contained:
```sql
DROP TABLE IF EXISTS revenue_entries CASCADE;
DROP TABLE IF EXISTS kpi_records CASCADE;
```

## 🔧 Immediate Actions Required

### Step 1: Fix the Schema Issue (URGENT)

The original problem was a column name mismatch. Fix it with this **SAFE** migration:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE kpi_records RENAME COLUMN kpi_period TO period;
```

Or use the full safe migration: `backend/migrations/SAFE_fix_kpi_period_column.sql`

### Step 2: Verify Tables Exist

Check your tables in Supabase SQL Editor:

```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('revenue_entries', 'kpi_records', 'financial_documents')
ORDER BY table_name;
```

Expected result:
- `revenue_entries` - exists with ~10 columns
- `kpi_records` - exists with ~13 columns (including `period` not `kpi_period`)
- `financial_documents` - exists

### Step 3: Check for Any Remaining Data

```sql
-- Check if any data survived
SELECT 'revenue_entries' as table_name, COUNT(*) as rows FROM revenue_entries
UNION ALL
SELECT 'kpi_records', COUNT(*) FROM kpi_records
UNION ALL
SELECT 'financial_documents', COUNT(*) FROM financial_documents;
```

If all show 0 rows, data is completely lost.

## 📦 Backup System Setup (Prevent Future Loss)

### Quick Setup (5 minutes)

1. **Install dependencies** (if needed):
   ```bash
   cd backend
   pip install python-dotenv supabase
   ```

2. **Test backup system**:
   ```bash
   python backup_database.py
   ```

3. **Verify backup created**:
   ```bash
   cd backups
   dir
   ```

### Easy Backup (Double-click)

Just double-click: `backend/BACKUP_NOW.bat`

## 🔄 Starting Fresh

Since there's no backup available, you'll need to:

### 1. Re-enter Revenue Data

Go to **Master Revenue** page and enter:
- Monthly revenue for each month
- Set your annual FIR target
- Add profit margin goals

### 2. Upload Financial Documents

Go to **Financial Statements** page and:
- Upload your P&L statements (PDF or CSV)
- Or manually enter using the form

### 3. Generate KPIs

After entering revenue data:
- Click "Refresh KPIs" button on dashboard
- Wait for KPI generation to complete
- Verify KPIs appear correctly

### 4. Set Up Services (if using)

Go to **Service Mix** and:
- Add your services
- Set COGS for each service
- Track weekly activities

### 5. Employee LER (if using)

Go to **Employee LER** page and:
- Add employee information
- Create pay periods
- Enter daily records

## 🛡️ Backup Schedule Going Forward

### Before EVERY Migration:
```bash
cd backend
python backup_database.py
```

### Daily Backups (Recommended):
Set up Windows Task Scheduler:
- Program: `python`
- Arguments: `backup_database.py`
- Start in: `C:\...\Waverider\backend`
- Trigger: Daily at 2:00 AM

### Weekly Backups (Minimum):
- Every Sunday at 2:00 AM
- Keep for 4 weeks

### Before Major Changes:
- Bulk data imports
- App updates
- Schema changes
- Testing new features

## 🚫 Never Run These Migrations

**DANGEROUS - Will delete all data:**

1. ❌ `09_fix_revenue_kpi_user_id.sql`
2. ❌ `07_fix_financial_documents_for_clerk.sql`
3. ❌ `03_fix_service_mix_user_id.sql`

**Why?** They all contain `DROP TABLE` commands.

**Safe Alternative:** Use migrations that only `ALTER TABLE` or `RENAME COLUMN`.

## ✅ Safe Migration Checklist

Before running ANY migration:

- [ ] Backup database first
- [ ] Read entire SQL file
- [ ] Look for: `DROP`, `DELETE`, `TRUNCATE`
- [ ] Test on local database if possible
- [ ] Run during low-traffic time
- [ ] Verify data after migration
- [ ] Keep backup for 7+ days

## 📊 Data Recovery Priority

If you had backups, restore in this order:

1. **revenue_entries** (CRITICAL) - All revenue data
2. **kpi_records** (HIGH) - Can be regenerated but takes time
3. **financial_documents** (HIGH) - Uploaded documents
4. **profiles** (MEDIUM) - User settings
5. **services** (MEDIUM) - Service definitions
6. **employee_info** (MEDIUM) - Employee data
7. **Other tables** (LOW) - Can be recreated

## 🎯 Prevention Checklist

- [ ] Backup system installed and tested
- [ ] Scheduled daily backups
- [ ] Dangerous migrations renamed/deleted
- [ ] Safe migration template created
- [ ] Team trained on backup procedures
- [ ] Recovery plan tested
- [ ] Cloud backup storage configured (optional)

## 💡 Lessons Learned

### What Went Wrong:
1. Migration used `DROP TABLE` instead of `ALTER TABLE`
2. No backup existed (free Supabase plan)
3. Migration ran without testing
4. No data recovery option

### What to Do Differently:
1. ✅ Always backup before migrations
2. ✅ Use safe migration patterns only
3. ✅ Test migrations on local/test database
4. ✅ Review SQL before running
5. ✅ Keep multiple backup copies
6. ✅ Consider upgrading to Supabase Pro ($25/month for automatic backups)

## 📞 Emergency Contacts

If you need help:
1. Check `BACKUP_SYSTEM_README.md`
2. Review Supabase documentation
3. Check GitHub issues
4. Contact Supabase support (if Pro plan)

## 🔄 Recovery Status

**Current Status**: ❌ Data lost, no backup available

**Next Steps**:
1. ✅ Fix schema (rename column)
2. ✅ Set up backup system
3. ⏳ Re-enter data manually
4. ✅ Create first backup
5. ✅ Schedule automatic backups

---

**Remember**: An ounce of prevention is worth a pound of cure! 🛡️

**Backup before EVERY migration. No exceptions.**
