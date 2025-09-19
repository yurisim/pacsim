# Operation Pacific Shield (OPS)

This repository contains the digital implementation of the "Operation Pacific Shield" (OPS) wargame, a culminating capstone exercise for the Officer Training School (OTS). The application provides an experiential learning environment for Officer Trainees (OTs) to plan, brief, and execute a joint scheme of maneuver in a high-intensity, contested, and operationally limited environment.

The primary goal is to employ Agile Combat Employment (ACE) concepts in a fictional conflict. Players manage resources, establish Forward Operating Sites (FOS), and coordinate between different command teams to achieve mission objectives and accumulate Mission Points (MP).

## Core Application Features

- **Multi-Team Gameplay:** Supports distinct teams, including a Combined Air Operations Center (CAOC), a Combined Space Operations Center (CSpOC), and multiple Main Operating Bases (MOBs), each with unique roles and responsibilities.
- **Real-time Game State:** Utilizes WebSockets to ensure all players have a live, synchronized view of the game board, assets, and events.
- **Persistent Game Sessions:** Game states are saved to a database, allowing for sessions to be paused and resumed.
- **Complex Rule Enforcement:** The system is designed to programmatically enforce the game's complex rules for movement, combat, logistics, and scoring.
- **Dynamic Scenarios:** Simulates the fog and friction of war through event cards, political shifts, and resource constraints.

## Technical Overview

This project is a monorepo managed by [Nx](https://nx.dev).

- **Frontend (`pac-shield`):** An [Angular](https://angular.io/) application providing the main user interface, game board visualization, and player controls.
- **Backend (`pac-shield-api`):** A [NestJS](https://nestjs.com/) application that manages game logic, API endpoints, and WebSocket communication.
- **Database:** A PostgreSQL database managed with [Prisma](https://www.prisma.io/) as the Object-Relational Mapper (ORM).
- **Real-time Communication:** Handled by the `EventsGateway` in the NestJS API using WebSockets.

## Complete Development Environment Setup

This guide will walk you through setting up a complete development environment from scratch, assuming you're starting with a fresh Windows machine.

### Step 1: Install Essential Tools

#### 1.1 Install Visual Studio Code
1. Download VS Code from [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. Run the installer and follow the setup wizard
3. **Important**: During installation, check "Add to PATH" option
4. Install these recommended extensions:
   - Angular Language Service
   - Prisma
   - GitLens
   - Docker
   - WSL (if using Windows)

#### 1.2 Install Git
1. Download Git from [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. During installation, use default options but use VS Code as the default editor
3. Configure Git with your information:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

#### 1.3 Enable WSL2 (Windows Subsystem for Linux) - Windows Only
1. Open PowerShell as Administrator
2. Enable WSL and Virtual Machine features:
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. Restart your computer
4. Download and install the WSL2 Linux kernel update package from Microsoft
5. Set WSL2 as default:
   ```powershell
   wsl --set-default-version 2
   ```
6. Install Ubuntu from Microsoft Store and complete initial setup

### Step 2: Configure PowerShell Execution Policy (Windows)

1. Open PowerShell as Administrator
2. Set execution policy to allow script running:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` when prompted to confirm

### Step 3: Install Docker Desktop

#### 3.1 Download and Install Docker Desktop
1. Download Docker Desktop from [https://docs.docker.com/desktop/](https://docs.docker.com/desktop/)
2. Run the installer
3. **Important**: During installation, ensure "Use WSL 2 instead of Hyper-V" is selected (Windows)
4. Restart your computer when prompted
5. Start Docker Desktop and complete the initial setup
6. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

### Step 4: Install Node.js and Package Managers

#### 4.1 Install Node.js
1. Download Node.js LTS from [https://nodejs.org/](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. **Important**: Check "Automatically install necessary tools" during installation
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### 4.2 Enable Corepack and Yarn
1. **Remove any existing global package managers** (recommended):
   ```bash
   npm uninstall -g yarn pnpm
   ```

2. **Enable Corepack** (included with Node.js):
   ```bash
   corepack enable
   ```

3. **Install Corepack if missing** (some Node.js distributions may not include it):
   ```bash
   npm install -g corepack
   corepack enable
   ```

4. **Verify Corepack and Yarn installation**:
   ```bash
   # Check if Corepack is working
   yarn exec env

   # Check Yarn version (should show version specified in package.json)
   yarn --version
   ```

**Note**: This project uses Yarn 4.9.4 as specified in `package.json`. Corepack will automatically use the correct version when you run Yarn commands in the project directory.

### Step 5: Set Up PostgreSQL Database with Docker

#### 5.1 Start PostgreSQL
1. Open terminal in your project directory
2. Start the database:
   ```bash
   docker-compose up -d
   ```
3. Verify it's running:
   ```bash
   docker-compose ps
   ```

### Step 6: Clone and Set Up the Project

#### 6.1 Clone the Repository
```bash
git clone <repository-url>
cd pacsim
```

#### 6.2 Install Dependencies
```bash
yarn install
```

### Step 7: Initialize the Database

#### 7.1 Generate Prisma Client and Apply Schema
```bash
# Generate Prisma client and DTOs
npx nx prisma-generate pac-shield-api

# Apply database schema
npx nx prisma-db-push pac-shield-api
```

#### 7.2 Verify Database Setup
```bash
# Open Prisma Studio to view your database
npx nx prisma-studio pac-shield-api
```

### Step 8: Start the Development Environment

#### 8.1 Start Both Applications
Open two terminal windows/tabs:

**Terminal 1 - Backend API:**
```bash
npx nx serve pac-shield-api
```

**Terminal 2 - Frontend UI:**
```bash
npx nx serve pac-shield
```

#### 8.2 Access the Application
- Frontend: [http://localhost:4200](http://localhost:4200)
- Backend API: [http://localhost:3000](http://localhost:3000)
- Prisma Studio: [http://localhost:5555](http://localhost:5555)

### Troubleshooting Common Issues

#### Node.js/Yarn/Corepack Issues
- **"yarn command not found"**: Run `corepack enable` to activate Corepack
- **"corepack command not found"**: Install Corepack with `npm install -g corepack`
- **Yarn version mismatch**: Corepack will automatically use Yarn 4.9.4 as specified in package.json
- **Permission errors**: On Windows, run terminal as Administrator when enabling Corepack
- **Corepack not working**: Remove global Yarn first: `npm uninstall -g yarn pnpm`

#### Docker Issues
- **"Docker daemon not running"**: Start Docker Desktop application
- **Port conflicts**: Stop other services using port 5432 or change the port in docker-compose.yml

#### Database Connection Issues
- **Connection refused**: Ensure PostgreSQL container is running with `docker-compose ps`
- **Authentication failed**: Check credentials in `.env` file match docker-compose.yml

#### PowerShell Issues (Windows)
- **"Execution of scripts is disabled"**: Run `Set-ExecutionPolicy RemoteSigned` as Administrator

#### WSL Issues (Windows)
- **"WSL not found"**: Enable WSL feature and install a Linux distribution from Microsoft Store
- **Docker not working in WSL**: Ensure Docker Desktop has WSL integration enabled

### Prerequisites Summary

After completing this setup, you should have:
- ✅ Visual Studio Code with recommended extensions
- ✅ Git configured with your credentials
- ✅ WSL2 enabled (Windows)
- ✅ PowerShell execution policy configured (Windows)
- ✅ Docker Desktop running
- ✅ Node.js installed with Corepack enabled for Yarn 4.9.4
- ✅ PostgreSQL running in Docker
- ✅ Project dependencies installed
- ✅ Database schema applied
- ✅ Both frontend and backend servers running

## Development Commands

### Key Commands

Here are the most common commands for managing the workspace after initial setup.

#### General Development
- **Run Frontend:** `npx nx serve pac-shield`
- **Run Backend:** `npx nx serve pac-shield-api`
- **Build Frontend:** `npx nx build pac-shield`
- **Build Backend:** `npx nx build pac-shield-api`
- **Run API Tests:** `npx nx test pac-shield-api`
- **Run Frontend Tests:** `npx nx test pac-shield`
- **Run E2E Tests:** `npx nx e2e pac-shield-e2e`
- **Run API E2E Tests:** `npx nx e2e pac-shield-api-e2e`

#### Database (Prisma)
All database commands are targeted at the `pac-shield-api` project.

- **Generate Prisma Client:** (Run this after changing `schema.prisma`)
  ```bash
  npx nx prisma-generate pac-shield-api
  ```
- **Apply Schema Changes:** (Pushes non-destructive changes to the DB)
  ```bash
  npx nx prisma-db-push pac-shield-api
  ```
- **Reset the Database:** (Clears all data and re-applies migrations)
  ```bash
  npx nx prisma-db-reset pac-shield-api
  ```
- **Open Prisma Studio:** (A GUI for viewing and editing database records)
  ```bash
  npx nx prisma-studio pac-shield-api
  ```

#### Docker Management
- **Start PostgreSQL:** `docker-compose up -d postgres`
- **Stop PostgreSQL:** `docker-compose down`
- **View container status:** `docker-compose ps`
- **View database logs:** `docker-compose logs postgres`

#### Code Quality
- **Lint Frontend:** `npx nx lint pac-shield`
- **Lint Backend:** `npx nx lint pac-shield-api`
- **Format code:** `npx nx format:write`
- **Check formatting:** `npx nx format:check`

### Explore the Workspace

Run `npx nx graph` to see a visual diagram of the projects and their dependencies.

### Additional Services

#### Qdrant Vector Database (Optional)
For AI/ML features, you can optionally run Qdrant:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following the project's coding standards
4. Test your changes thoroughly
5. Submit a pull request with a clear description of your changes

## Support

If you encounter issues during setup or development:

1. Check the troubleshooting section above
2. Review the project's issue tracker
3. Ensure all prerequisites are properly installed
4. Verify that Docker containers are running with `docker-compose ps`

For specific technical questions, please refer to the individual framework documentation:
- [Angular Documentation](https://angular.io/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Nx Documentation](https://nx.dev/docs)

