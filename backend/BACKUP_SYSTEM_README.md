# 🛡️ WaveRider Database Backup System

## Overview

This backup system protects your data from accidental deletion, migration errors, or database corruption.

## 🚨 What Happened?

**November 2, 2025**: Migration `09_fix_revenue_kpi_user_id.sql` contained `DROP TABLE` commands that **deleted all data** from:
- `revenue_entries` (all revenue data)
- `kpi_records` (all KPI calculations)

**Root Cause**: The migration used `DROP TABLE IF EXISTS` to "start fresh" instead of safely altering existing tables.

**Impact**: Complete data loss with no recovery option (free Supabase plan has no backups).

## ✅ Prevention System

### 1. Backup Script (`backup_database.py`)

**What it does:**
- Exports all critical tables to JSON files
- Creates timestamped backups in `./backups/` folder
- Generates restore instructions
- Shows summary of backed up data

**Tables backed up:**
- `revenue_entries` - Revenue data
- `kpi_records` - KPI calculations
- `financial_documents` - Uploaded documents
- `services` - Service definitions
- `service_activities` - Service tracking
- `employee_info` - Employee data
- `pay_periods` - Pay period records
- `employee_daily_records` - Daily LER records
- `cogs_settings` - COGS settings
- `company_settings` - Company settings
- `profiles` - User profiles

**Usage:**
```bash
cd backend
python backup_database.py
```

**Output:**
```
📦 Backing up revenue_entries... ✅ 144 rows
📦 Backing up kpi_records... ✅ 42 rows
📦 Backing up financial_documents... ✅ 8 rows
...
✅ BACKUP COMPLETE
📊 Total rows backed up: 247
```

### 2. Restore Script (`restore_database.py`)

**What it does:**
- Restores data from JSON backup files
- Inserts data in batches (handles large datasets)
- Confirms before restoring
- Shows summary of restored data

**Usage:**
```bash
cd backend
python restore_database.py 20251102_063000
```

**Safety:**
- Asks for confirmation before restoring
- Warns about potential duplicate data
- Shows which tables will be restored

## 📅 Recommended Backup Schedule

### Manual Backups (Immediate)
Run backup **before**:
- Running any migration
- Making bulk data changes
- Upgrading Supabase plan
- Major app updates

### Automated Backups (Future)

**Daily backups** (recommended):
```bash
# Windows Task Scheduler
# Run: python backup_database.py
# Time: 2:00 AM daily
```

**Weekly backups** (minimum):
```bash
# Run every Sunday at 2:00 AM
```

## 🔒 Backup Storage

### Current: Local Storage
- Location: `backend/backups/`
- Format: JSON files with timestamps
- Naming: `{table_name}_{timestamp}.json`

### Recommended: Cloud Storage
Upload backups to:
- Google Drive
- Dropbox
- AWS S3
- Azure Blob Storage

**Why?** Local backups are lost if your computer fails.

## 🚫 Dangerous Migrations

These migrations contain `DROP TABLE` and **will delete all data**:

### ⚠️ NEVER RUN THESE:
1. `09_fix_revenue_kpi_user_id.sql` - Drops revenue_entries & kpi_records
2. `07_fix_financial_documents_for_clerk.sql` - Drops financial_documents
3. `03_fix_service_mix_user_id.sql` - Drops services & service_activities

### ✅ Safe Alternative:
Use `SAFE_fix_kpi_period_column.sql` which:
- Renames columns without dropping tables
- Preserves all existing data
- Checks table state before making changes

## 📝 Safe Migration Checklist

Before running ANY migration:

- [ ] **Backup first**: Run `python backup_database.py`
- [ ] **Review SQL**: Check for `DROP TABLE`, `DELETE FROM`, `TRUNCATE`
- [ ] **Test locally**: Run on local database first
- [ ] **Verify backup**: Check that backup files exist and have data
- [ ] **Run migration**: Execute in Supabase SQL Editor
- [ ] **Verify data**: Check that data still exists after migration
- [ ] **Keep backup**: Don't delete backup for at least 7 days

## 🆘 Emergency Recovery

If you lose data:

### Step 1: Don't Panic
- Stop making changes
- Don't run more migrations
- Don't delete anything

### Step 2: Check for Backups
```bash
cd backend/backups
ls -la
```

### Step 3: Restore Latest Backup
```bash
python restore_database.py <timestamp>
```

### Step 4: Verify Restoration
- Check row counts in Supabase dashboard
- Test app functionality
- Verify critical data is present

## 💡 Best Practices

### 1. **Always Backup Before Migrations**
```bash
# ALWAYS do this first
python backup_database.py

# Then run migration
# In Supabase SQL Editor
```

### 2. **Use Safe Migration Patterns**
```sql
-- ❌ DANGEROUS - Deletes all data
DROP TABLE IF EXISTS my_table;

-- ✅ SAFE - Preserves data
ALTER TABLE my_table RENAME COLUMN old_name TO new_name;
ALTER TABLE my_table ADD COLUMN new_column TEXT;
ALTER TABLE my_table ALTER COLUMN my_column TYPE TEXT;
```

### 3. **Test Migrations Locally First**
- Use a local Supabase instance
- Or create a test project
- Never test on production data

### 4. **Keep Multiple Backups**
- Daily backups for 7 days
- Weekly backups for 4 weeks
- Monthly backups for 12 months

### 5. **Verify Backups Work**
Periodically test restore:
```bash
# Restore to test database
python restore_database.py <timestamp>
```

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pip install python-dotenv supabase
```

### 2. Configure Environment
Ensure `.env` has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Create Backups Folder
```bash
mkdir backups
```

### 4. Test Backup
```bash
python backup_database.py
```

### 5. Test Restore (Optional)
```bash
# List available backups
python restore_database.py

# Restore specific backup
python restore_database.py 20251102_063000
```

## 📊 Backup File Structure

```
backend/
├── backups/
│   ├── revenue_entries_20251102_063000.json
│   ├── kpi_records_20251102_063000.json
│   ├── financial_documents_20251102_063000.json
│   ├── RESTORE_20251102_063000.sql
│   └── ...
├── backup_database.py
├── restore_database.py
└── .env
```

## 🎯 Recovery Time Objective (RTO)

**How fast can you recover?**

- **Backup time**: ~30 seconds (for typical dataset)
- **Restore time**: ~1-2 minutes (for typical dataset)
- **Total downtime**: ~2-3 minutes

**Compare to:**
- Supabase Pro backup restore: ~5-10 minutes
- Manual data re-entry: Hours to days
- No backup: **Permanent data loss** ❌

## 💰 Cost Comparison

### Free Plan (Current)
- ❌ No automatic backups
- ✅ Manual backups (free)
- ⏱️ Requires discipline

### Pro Plan ($25/month)
- ✅ Automatic daily backups
- ✅ Point-in-time recovery
- ✅ 7-day retention
- 💰 $300/year

### DIY Backup System (This)
- ✅ Unlimited backups
- ✅ Full control
- ✅ Cloud storage option
- 💰 Free (or minimal cloud storage cost)

## 📞 Support

If you need help:
1. Check this README
2. Review backup logs
3. Test restore on empty tables first
4. Contact support if data corruption occurs

## 🔄 Version History

- **v1.0** (Nov 2, 2025): Initial backup system after data loss incident
- Includes backup, restore, and documentation
- Protects against future migration disasters

---

**Remember**: The best backup is the one you have BEFORE you need it! 🛡️
