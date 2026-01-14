@echo off
chcp 65001 >nul
title INI Translate - Direct Mode

echo.
echo ========================================
echo      INI Translation Tool - Direct Mode
echo ========================================
echo.
echo Start time: %date% %time%
echo.

if not exist "ini-translate.exe" (
    echo ERROR: ini-translate.exe not found!
    pause
    exit /b 1
)

ini-translate.exe translate

echo.
echo End time: %date% %time%
echo.
echo Translation completed!
echo Output files: export directory
echo Backup files: backup directory
echo.
pause
