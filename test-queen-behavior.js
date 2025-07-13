#!/usr/bin/env node

/**
 * Test different queen types and their decision-making behavior
 */

import { QueenCoordinator } from './src/cli/simple-commands/hive-mind/queen.js';

console.log('🔍 TESTING QUEEN BEHAVIOR DIFFERENCES');
console.log('='.repeat(60));

async function testQueenDecisions() {
  const testScenarios = [
    {
      topic: "Implementation approach",
      options: ["scalable microservices", "quick monolith", "maintainable modules"]
    },
    {
      topic: "Performance optimization", 
      options: ["fast caching", "efficient algorithms", "future-proof architecture"]
    },
    {
      topic: "Development strategy",
      options: ["simple implementation", "extensible framework", "quick prototype"]
    }
  ];

  const queenTypes = ['strategic', 'tactical', 'adaptive'];
  
  for (const queenType of queenTypes) {
    console.log(`\n👑 TESTING ${queenType.toUpperCase()} QUEEN`);
    console.log('-'.repeat(40));
    
    const queen = new QueenCoordinator({
      swarmId: 'test-swarm',
      type: queenType
    });
    
    for (const scenario of testScenarios) {
      console.log(`\n📝 Topic: ${scenario.topic}`);
      console.log(`Options: [${scenario.options.join(', ')}]`);
      
      // Simulate worker votes
      const workerVotes = {
        'worker-1': scenario.options[0],
        'worker-2': scenario.options[1], 
        'worker-3': scenario.options[0],
        'worker-4': scenario.options[2]
      };
      
      try {
        const decision = await queen.makeDecision(scenario.topic, scenario.options, workerVotes);
        console.log(`✅ ${queenType} queen decided: "${decision}"`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
}

testQueenDecisions().catch(console.error);