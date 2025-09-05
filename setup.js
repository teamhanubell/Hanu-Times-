#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

console.log('🎓 Hanu-Planner Setup & Launch Script');
console.log('=====================================\n');

async function checkNodeVersion() {
  return new Promise((resolve) => {
    exec('node --version', (error, stdout) => {
      if (error) {
        console.log('❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org');
        process.exit(1);
      }
      const version = stdout.trim();
      const majorVersion = parseInt(version.substring(1).split('.')[0]);
      if (majorVersion < 16) {
        console.log(`❌ Node.js ${version} detected. Please upgrade to Node.js 16+`);
        process.exit(1);
      }
      console.log(`✅ Node.js ${version} detected`);
      resolve();
    });
  });
}

async function installDependencies() {
  console.log('\n📦 Installing dependencies...');
  
  // Root dependencies
  console.log('Installing root dependencies...');
  await runCommand('npm install', process.cwd());
  
  // Frontend dependencies
  console.log('Installing frontend dependencies...');
  await runCommand('npm install', path.join(process.cwd(), 'frontend'));
  
  // Netlify functions dependencies
  console.log('Installing Netlify functions dependencies...');
  await runCommand('npm install', path.join(process.cwd(), 'netlify', 'functions'));
  
  console.log('✅ All dependencies installed');
}

async function initializeDatabase() {
  console.log('\n🗄️ Initializing database...');
  
  const Database = require('./backend/models/Database');
  const db = new Database();
  
  try {
    await db.initialize();
    console.log('✅ Database initialized successfully');
    await db.close();
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

async function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, { 
      cwd, 
      stdio: 'pipe',
      shell: true 
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed: ${command}\n${output}`));
      }
    });
  });
}

async function startDevelopmentServers() {
  console.log('\n🚀 Starting development servers...\n');
  
  // Start backend server
  console.log('Starting backend server on http://localhost:5000...');
  const backend = spawn('npm', ['run', 'server'], { 
    cwd: process.cwd(),
    stdio: 'pipe',
    shell: true 
  });
  
  backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });
  
  backend.stderr.on('data', (data) => {
    console.log(`[Backend Error] ${data.toString().trim()}`);
  });
  
  // Wait a moment for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Start frontend server
  console.log('Starting frontend server on http://localhost:3000...');
  const frontend = spawn('npm', ['start'], { 
    cwd: path.join(process.cwd(), 'frontend'),
    stdio: 'pipe',
    shell: true 
  });
  
  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('webpack compiled') || output.includes('Local:')) {
      console.log(`[Frontend] ${output.trim()}`);
    }
  });
  
  frontend.stderr.on('data', (data) => {
    console.log(`[Frontend Error] ${data.toString().trim()}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
  
  console.log('\n✅ Servers started successfully!');
  console.log('📱 Frontend: http://localhost:3000');
  console.log('🔧 Backend API: http://localhost:5000/api');
  console.log('\nPress Ctrl+C to stop all servers');
}

async function main() {
  try {
    await checkNodeVersion();
    await installDependencies();
    await initializeDatabase();
    await startDevelopmentServers();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Check if this is being run directly
if (require.main === module) {
  main();
}

module.exports = { main };
