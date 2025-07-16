#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import { spawn } from 'node:child_process';

console.log('Installing Claude-Flow...');

// Check if Deno is available
function checkDeno() {
  return new Promise((resolve) => {
    const deno = spawn('deno', ['--version'], { stdio: 'pipe' });
    deno.on('close', (code) => {
      resolve(code === 0);
    });
    deno.on('error', () => {
      resolve(false);
    });
  });
}

// Install Deno if not available
async function installDeno() {
  console.log('Deno not found. Installing Deno...');
  
  const platform = os.platform();
  const arch = os.arch();
  
  if (platform === 'win32') {
    console.log('Please install Deno manually from https://deno.land/');
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const installScript = spawn('curl', ['-fsSL', 'https://deno.land/x/install/install.sh'], { stdio: 'pipe' });
    const sh = spawn('sh', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    
    installScript.stdout.pipe(sh.stdin);
    
    sh.on('close', (code) => {
      if (code === 0) {
        console.log('Deno installed successfully!');
        resolve();
      } else {
        reject(new Error('Failed to install Deno'));
      }
    });
  });
}

// Auto-register all supported MCP servers from mcp.yaml
async function autoRegisterMCP() {
  return new Promise((resolve) => {
    console.log('Checking for Claude Code integration...');
    
    // Check if Claude Code CLI is available
    const claudeCheck = spawn('claude', ['--version'], { stdio: 'pipe' });
    
    claudeCheck.on('close', (code) => {
      if (code === 0) {
        console.log('Claude Code detected! Auto-registering all supported MCP servers...');
        
        // Register all MCP servers defined in mcp.yaml
        registerAllMCPServers(resolve);
        
      } else {
        console.log('Claude Code not detected. Manual MCP setup will be required.');
        console.log('After installing Claude Code, run these commands:');
        showManualRegistrationCommands();
        resolve();
      }
    });
    
    claudeCheck.on('error', () => {
      console.log('Claude Code not found. Manual MCP setup will be required.');
      resolve();
    });
    
    // Timeout fallback for claude check
    setTimeout(() => {
      console.log('Claude Code detection timed out. Continuing installation...');
      resolve();
    }, 5000);
  });
}

// Register all MCP servers sequentially
async function registerAllMCPServers(resolve) {
  const isGlobal = process.env.npm_config_global === 'true';
  
  // Define all MCP servers from mcp.yaml
  const mcpServers = [
    {
      name: 'claude-flow',
      description: 'Advanced swarm coordination, neural optimization & intelligent task orchestration',
      command: isGlobal ? 
        ['mcp', 'add', 'claude-flow', 'claude-flow', 'mcp', 'start'] :
        ['mcp', 'add', 'claude-flow', 'npx', 'claude-flow', 'mcp', 'start'],
      priority: 'high'
    },
    {
      name: 'context7',
      description: 'Official library documentation & code examples | Research standards',
      command: ['mcp', 'add', 'context7', 'npx', '-y', 'server-context7'],
      priority: 'medium'
    },
    {
      name: 'perplexity',
      description: 'Real-time web search & current information retrieval',
      command: ['mcp', 'add', 'perplexity', 'npx', '-y', 'server-perplexity-ask'],
      priority: 'medium'
    },
    {
      name: 'sequential-thinking',
      description: 'Structured reasoning & step-by-step problem solving',
      command: ['mcp', 'add', 'sequential-thinking', 'npx', '-y', '@modelcontextprotocol/server-sequential-thinking'],
      priority: 'low'
    }
  ];

  console.log(`Installing ${isGlobal ? 'global' : 'local'} MCP servers...`);
  
  let successCount = 0;
  let totalServers = mcpServers.length;
  let completedServers = 0;
  
  // Register servers sequentially to avoid conflicts
  const registerServer = (serverIndex) => {
    if (serverIndex >= mcpServers.length) {
      // All servers processed
      console.log(`\n✅ MCP registration complete: ${successCount}/${totalServers} servers registered successfully!`);
      if (successCount > 0) {
        console.log('🎉 Available MCP capabilities:');
        mcpServers.forEach(server => {
          console.log(`   • ${server.name}: ${server.description}`);
        });
      }
      if (successCount < totalServers) {
        console.log('\n⚠️  Some servers failed to register. Manual registration available:');
        showManualRegistrationCommands();
      }
      resolve();
      return;
    }
    
    const server = mcpServers[serverIndex];
    console.log(`\n📦 Registering ${server.name} MCP server...`);
    
    const register = spawn('claude', server.command, { 
      stdio: ['ignore', 'inherit', 'inherit'], // Ignore stdin, show stdout/stderr
      timeout: 15000 // 15 second timeout per server
    });
    
    register.on('close', (regCode) => {
      completedServers++;
      if (regCode === 0) {
        successCount++;
        console.log(`   ✅ ${server.name} registered successfully`);
      } else {
        console.log(`   ❌ ${server.name} registration failed (exit code: ${regCode})`);
      }
      
      // Register next server
      setTimeout(() => registerServer(serverIndex + 1), 1000); // 1 second delay between registrations
    });
    
    register.on('error', (error) => {
      completedServers++;
      console.log(`   ❌ ${server.name} registration error: ${error.message}`);
      
      // Register next server
      setTimeout(() => registerServer(serverIndex + 1), 1000);
    });
    
    // Timeout fallback for individual server
    setTimeout(() => {
      if (completedServers === serverIndex) {
        completedServers++;
        console.log(`   ⏰ ${server.name} registration timed out`);
        register.kill('SIGKILL');
        
        // Register next server
        setTimeout(() => registerServer(serverIndex + 1), 1000);
      }
    }, 20000); // 20 second timeout per server
  };
  
  // Start registration process
  registerServer(0);
}

// Show manual registration commands for all MCP servers
function showManualRegistrationCommands() {
  const isGlobal = process.env.npm_config_global === 'true';
  
  console.log('\n📋 Manual MCP Server Registration Commands:');
  console.log('\n1. Claude-Flow (Primary):');
  if (isGlobal) {
    console.log('   claude mcp add claude-flow claude-flow mcp start');
  } else {
    console.log('   claude mcp add claude-flow npx claude-flow mcp start');
  }
  
  console.log('\n2. Context7 (Library Documentation):');
  console.log('   claude mcp add context7 npx -y server-context7');
  
  console.log('\n3. Perplexity (Web Search):');
  console.log('   claude mcp add perplexity npx -y server-perplexity-ask');
  console.log('   # Note: Requires PERPLEXITY_API_KEY environment variable');
  
  console.log('\n4. Sequential Thinking (Problem Solving):');
  console.log('   claude mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking');
  
  console.log('\n💡 Tip: Register servers in this order for optimal functionality.');
}

// Main installation process
async function main() {
  try {
    const denoAvailable = await checkDeno();
    
    if (!denoAvailable) {
      await installDeno();
    }
    
    console.log('Claude-Flow installation completed!');
    console.log('You can now use: npx claude-flow or claude-flow (if installed globally)');
    
    // Auto-register MCP server
    await autoRegisterMCP();
    
  } catch (error) {
    console.error('Installation failed:', error.message);
    console.log('Please install Deno manually from https://deno.land/ and try again.');
    process.exit(1);
  }
}

main();