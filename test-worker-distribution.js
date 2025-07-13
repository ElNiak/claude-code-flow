#!/usr/bin/env node

/**
 * Test worker type distribution analysis
 */

// Simulate worker type distribution algorithm
function analyzeWorkerDistribution(totalWorkers) {
  const workerTypes = ['researcher', 'coder', 'analyst', 'tester'];
  const distribution = {};
  
  console.log(`\n🔍 Analyzing distribution for ${totalWorkers} workers:`);
  console.log(`Worker types: [${workerTypes.join(', ')}]`);
  
  for (let i = 0; i < totalWorkers; i++) {
    const workerType = workerTypes[i % workerTypes.length];
    distribution[workerType] = (distribution[workerType] || 0) + 1;
    
    if (i < 10 || i >= totalWorkers - 5) {
      console.log(`Worker ${i + 1}: ${workerType}`);
    } else if (i === 10) {
      console.log(`... (workers 11-${totalWorkers - 5}) ...`);
    }
  }
  
  console.log(`\n📊 Final Distribution:`);
  for (const [type, count] of Object.entries(distribution)) {
    const percentage = ((count / totalWorkers) * 100).toFixed(1);
    console.log(`  ${type}: ${count} workers (${percentage}%)`);
  }
  
  return distribution;
}

// Test different scenarios
console.log('='.repeat(60));
console.log('WORKER TYPE DISTRIBUTION ANALYSIS');
console.log('='.repeat(60));

analyzeWorkerDistribution(3);
analyzeWorkerDistribution(8);
analyzeWorkerDistribution(20);
analyzeWorkerDistribution(100);

console.log('\n' + '='.repeat(60));
console.log('CONCLUSION: Workers cycle through [researcher, coder, analyst, tester]');
console.log('Equal distribution when total is multiple of 4');
console.log('Remainder goes to earlier types in the array');
console.log('='.repeat(60));