/**
 * Simple test script to verify dual-stream logging functionality
 */

import { ComponentLoggerFactory, generateCorrelationId, generateSessionId } from './dist/core/logger.js';
import fs from 'fs/promises';
import path from 'path';

async function testDualStreamLogging() {
  console.log('🧪 Testing Claude-Flow Dual-Stream Logging System...\n');

  // Generate test session identifiers
  const correlationId = generateCorrelationId();
  const sessionId = generateSessionId();
  
  console.log(`📋 Test Session Info:`);
  console.log(`   Correlation ID: ${correlationId}`);
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Test Command: test-validation\n`);

  try {
    // Create output manager for testing
    const outputManager = ComponentLoggerFactory.getCLIOutputManager('test-validation', correlationId, sessionId);
    
    console.log('✅ Output manager created successfully');
    console.log(`📁 Session Path: ${outputManager.getSessionPath()}\n`);

    // Test human-readable stdout output
    console.log('🧪 Testing human-readable stdout output...');
    
    outputManager.userInfo('Test session initialized', { sessionId });
    outputManager.userInfo('Testing dual-stream logging capabilities', { sessionId });
    outputManager.userWarning('This is a warning message', { sessionId });
    outputManager.userSuccess('This is a success message', { sessionId });
    
    // Test operation tracking
    const operationId = outputManager.startOperation('Test Operation', sessionId);
    outputManager.updateProgress({
      operationId,
      current: 1,
      total: 3,
      message: 'Processing step 1'
    });
    outputManager.updateProgress({
      operationId,
      current: 2,
      total: 3,
      message: 'Processing step 2'
    });
    outputManager.updateProgress({
      operationId,
      current: 3,
      total: 3,
      message: 'Processing step 3'
    });
    outputManager.completeOperation(operationId, {
      success: true,
      message: 'Test operation completed successfully',
      duration: 1500
    });

    // Test memory pressure simulation
    console.log('\n🧪 Testing memory pressure simulation...');
    outputManager.activateEmergencyMode(0.96, 'Simulated high memory pressure');
    outputManager.userInfo('Message during high memory pressure', { sessionId });
    
    outputManager.activateEmergencyMode(0.993, 'Simulated extreme memory pressure');
    outputManager.userWarning('Message during extreme memory pressure', { sessionId });

    // Flush session to ensure all data is written
    console.log('\n💾 Flushing session data...');
    await outputManager.flushSession();

    // Check if session file was created
    console.log('\n📂 Checking session file creation...');
    const sessionPath = outputManager.getSessionPath();
    const sessionDir = path.dirname(sessionPath);
    
    // Check if session directory exists
    await fs.access(sessionDir);
    console.log(`✅ Session directory exists: ${sessionDir}`);
    
    // Check if session file exists
    await fs.access(sessionPath);
    console.log(`✅ Session file exists: ${sessionPath}`);
    
    // Read and display session file content
    const content = await fs.readFile(sessionPath, 'utf-8');
    console.log(`📄 Session file content (${content.length} bytes):`);
    console.log('─'.repeat(60));
    console.log(content);
    console.log('─'.repeat(60));

    // Test error handling
    console.log('\n🧪 Testing error handling...');
    outputManager.userError('Test error message', new Error('Test error for validation'), { sessionId });

    console.log('\n✅ Dual-stream logging validation completed!');
    console.log(`📊 Memory pressure: ${(outputManager.getMemoryPressure() * 100).toFixed(1)}%`);
    console.log(`🚨 Emergency mode: ${outputManager.isInEmergencyMode() ? 'ACTIVE' : 'NORMAL'}`);

  } catch (error) {
    console.error('❌ Session file check failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDualStreamLogging().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});