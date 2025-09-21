#!/bin/bash

# Quiz System Setup Script - 100 Questions Integration
# Complete setup for full-stack DBMS project

echo "🚀 Setting up 100-Question Quiz Management System..."
echo "📊 Subjects: DBMS, FEDF, OOP, OS (25 questions each)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 14+ from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -c2-)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL is not installed. Please install MySQL from https://dev.mysql.com/downloads/${NC}"
    exit 1
fi

MYSQL_VERSION=$(mysql --version | awk '{print $5}' | cut -d',' -f1)
echo -e "${GREEN}✅ MySQL version: $MYSQL_VERSION${NC}"

# Step 2: Install Node.js dependencies
echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"

# Step 3: Setup environment configuration
echo -e "${BLUE}🔧 Setting up environment configuration...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}📝 Created .env file from .env.example${NC}"
    echo -e "${YELLOW}⚠️  Please update the .env file with your database credentials${NC}"
    echo -e "${YELLOW}   Edit DB_PASSWORD in .env file${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Step 4: Setup database
echo -e "${BLUE}🗄️  Setting up database with 100 questions...${NC}"
echo -e "${YELLOW}Please enter your MySQL root password when prompted:${NC}"

# Create database and tables
echo -e "${BLUE}Creating database schema...${NC}"
mysql -u root -p < database_schema.sql
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create database schema${NC}"
    exit 1
fi

# Migrate all 100 questions
echo -e "${BLUE}Importing 100 questions (DBMS, FEDF, OOP, OS)...${NC}"
mysql -u root -p < data_migration.sql
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to migrate questions data${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database setup completed with 100 questions!${NC}"

# Step 5: Setup public files
echo -e "${BLUE}📁 Setting up public files...${NC}"
mkdir -p public
cp index.html public/
cp script.js public/

# Copy style.css if it exists
if [ -f "style.css" ]; then
    cp style.css public/
    echo -e "${GREEN}✅ CSS file copied${NC}"
else
    echo -e "${YELLOW}⚠️  style.css not found, please copy it manually to public/style.css${NC}"
fi

echo -e "${GREEN}✅ Public files setup completed!${NC}"

# Step 6: Verify database content
echo -e "${BLUE}🔍 Verifying database content...${NC}"
QUESTION_COUNT=$(mysql -u root -p --skip-column-names -e "USE quiz_system; SELECT COUNT(*) FROM questions;" 2>/dev/null || echo "0")
echo -e "${GREEN}📊 Questions in database: $QUESTION_COUNT${NC}"

if [ "$QUESTION_COUNT" -eq "100" ]; then
    echo -e "${GREEN}✅ All 100 questions successfully loaded!${NC}"
else
    echo -e "${YELLOW}⚠️  Expected 100 questions, found $QUESTION_COUNT${NC}"
fi

# Step 7: Final setup
echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "  1. ${YELLOW}Update .env file with your database password${NC}"
echo -e "  2. ${BLUE}Start server: npm start${NC}"
echo -e "  3. ${BLUE}Open browser: http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}🔧 Development commands:${NC}"
echo -e "  ${GREEN}npm start${NC}     - Start production server"
echo -e "  ${GREEN}npm run dev${NC}   - Start development server (auto-restart)"
echo -e "  ${GREEN}npm run test${NC}  - Test API health"
echo ""
echo -e "${BLUE}📊 Database access:${NC}"
echo -e "  ${GREEN}mysql -u root -p quiz_system${NC}"
echo ""
echo -e "${BLUE}🎯 Quiz credentials:${NC}"
echo -e "  ${GREEN}Quiz password: 123${NC}"
echo -e "  ${GREEN}Author password: boat4567${NC}"
echo ""
echo -e "${BLUE}📚 Quiz content:${NC}"
echo -e "  ${GREEN}DBMS: Questions 1-25 (Database Management)${NC}"
echo -e "  ${GREEN}FEDF: Questions 26-50 (Frontend Frameworks)${NC}"
echo -e "  ${GREEN}OOP: Questions 51-75 (Object-Oriented Programming)${NC}"
echo -e "  ${GREEN}OS: Questions 76-100 (Operating Systems)${NC}"
echo ""
echo -e "${GREEN}🎓 Your DBMS project is ready for demonstration!${NC}"
