@echo off
REM Quiz System Setup Script for Windows - 100 Questions Integration
REM Complete setup for full-stack DBMS project

echo 🚀 Setting up 100-Question Quiz Management System...
echo 📊 Subjects: DBMS, FEDF, OOP, OS (25 questions each)

REM Step 1: Check prerequisites
echo 📋 Checking prerequisites...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 14+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Check if MySQL is installed
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL is not installed. Please install MySQL from https://dev.mysql.com/downloads/
    pause
    exit /b 1
)

echo ✅ MySQL is available

REM Step 2: Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!

REM Step 3: Setup environment configuration
echo 🔧 Setting up environment configuration...
if not exist .env (
    copy .env.example .env >nul
    echo 📝 Created .env file from .env.example
    echo ⚠️  Please update the .env file with your database credentials
    echo    Edit DB_PASSWORD in .env file
) else (
    echo ✅ .env file already exists
)

REM Step 4: Setup database
echo 🗄️  Setting up database with 100 questions...
echo Please enter your MySQL root password when prompted:

REM Create database and tables
echo Creating database schema...
mysql -u root -p < database_schema.sql
if errorlevel 1 (
    echo ❌ Failed to create database schema
    pause
    exit /b 1
)

REM Migrate all 100 questions
echo Importing 100 questions (DBMS, FEDF, OOP, OS)...
mysql -u root -p < data_migration.sql
if errorlevel 1 (
    echo ❌ Failed to migrate questions data
    pause
    exit /b 1
)

echo ✅ Database setup completed with 100 questions!

REM Step 5: Setup public files
echo 📁 Setting up public files...
if not exist public mkdir public
copy index.html public\ >nul
copy script.js public\ >nul

REM Copy style.css if it exists
if exist style.css (
    copy style.css public\ >nul
    echo ✅ CSS file copied
) else (
    echo ⚠️  style.css not found, please copy it manually to public\style.css
)

echo ✅ Public files setup completed!

REM Step 6: Final setup
echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo   1. Update .env file with your database password
echo   2. Start server: npm start
echo   3. Open browser: http://localhost:3000
echo.
echo 🔧 Development commands:
echo   npm start     - Start production server
echo   npm run dev   - Start development server (auto-restart)
echo   npm run test  - Test API health
echo.
echo 📊 Database access:
echo   mysql -u root -p quiz_system
echo.
echo 🎯 Quiz credentials:
echo   Quiz password: 123
echo   Author password: boat4567
echo.
echo 📚 Quiz content:
echo   DBMS: Questions 1-25 (Database Management)
echo   FEDF: Questions 26-50 (Frontend Frameworks)
echo   OOP: Questions 51-75 (Object-Oriented Programming)
echo   OS: Questions 76-100 (Operating Systems)
echo.
echo 🎓 Your DBMS project is ready for demonstration!
echo.
pause
