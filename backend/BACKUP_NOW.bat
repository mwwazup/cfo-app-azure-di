@echo off
echo ============================================
echo   WAVERIDER DATABASE BACKUP
echo ============================================
echo.

cd /d "%~dp0"

echo Running backup script...
echo.

python backup_database.py

echo.
echo ============================================
echo   Backup complete!
echo ============================================
echo.
pause
