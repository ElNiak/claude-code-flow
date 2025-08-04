import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { logger } from '../../../core/logger.js';
import {
  AgentType,
  AgentCapability,
  normalizeAgentType,
  getCapabilitiesForAgentType,
} from '../../../hive-mind/types.js';
import { getAllAgentTypes } from '../../../swarm/agent-types-unified.js';
import { agentFactory } from '../../agents/index.js';

// Get active swarm ID helper (placeholder implementation)
async function getActiveSwarmId(): Promise<string | null> {
  // This would normally check for active swarms
  // For now, return a default swarm ID
  return 'default-swarm';
}

// Get all unified agent types
const AGENT_TYPES: AgentType[] = getAllAgentTypes();

// Use the centralized capability function from hive-mind types
// This ensures all 54+ agent types are properly mapped
function getCapabilityMap(): Record<AgentType, AgentCapability[]> {
  const capabilityMap: Partial<Record<AgentType, AgentCapability[]>> = {};

  // Populate all agent types with their capabilities
  for (const agentType of AGENT_TYPES) {
    capabilityMap[agentType] = getCapabilitiesForAgentType(agentType);
  }

  return capabilityMap as Record<AgentType, AgentCapability[]>;
}

const CAPABILITY_MAP: Record<AgentType, AgentCapability[]> = getCapabilityMap();

// Get all available capabilities
function getAllCapabilities(): AgentCapability[] {
  const allCapabilities = new Set<AgentCapability>();
  Object.values(CAPABILITY_MAP).forEach((caps) => caps.forEach((cap) => allCapabilities.add(cap)));
  return Array.from(allCapabilities).sort();
}

export const spawnCommand = new Command('spawn')
  .description('Spawn specialized agents into the Hive Mind')
  .argument('[type]', 'Agent type to spawn')
  .option('-n, --name <string>', 'Custom agent name')
  .option('-c, --capabilities <items>', 'Additional capabilities (comma-separated)')
  .option('-s, --swarm-id <id>', 'Target swarm ID')
  .option('-i, --interactive', 'Interactive spawn mode', false)
  .option('-b, --batch <number>', 'Spawn multiple agents of same type', '1')
  .option('--auto-assign', 'Automatically assign to available tasks', false)
  .action(async (type, options) => {
    const spinner = ora('Spawning agent...').start();

    try {
      // Get or prompt for swarm ID
      const swarmId = options.swarmId || (await getActiveSwarmId());
      if (!swarmId) {
        throw new Error('No active swarm found. Initialize a Hive Mind first.');
      }

      // Interactive mode
      if (options.interactive || !type) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: 'Select agent type:',
            choices: AGENT_TYPES,
            when: !type,
          },
          {
            type: 'checkbox',
            name: 'additionalCapabilities',
            message: 'Select additional capabilities:',
            choices: getAllCapabilities(),
            when: (answers) => {
              const agentType = type || answers.type;
              return agentType === 'specialist';
            },
          },
          {
            type: 'input',
            name: 'customName',
            message: 'Enter custom agent name (optional):',
            when: !options.name,
          },
          {
            type: 'number',
            name: 'priority',
            message: 'Agent priority (1-10):',
            default: 5,
            validate: (input) => {
              const num = parseInt(input);
              return (num >= 1 && num <= 10) || 'Priority must be between 1 and 10';
            },
          },
        ]);

        // Merge answers with existing options
        type = type || answers.type;
        options.name = options.name || answers.customName;
        options.capabilities = options.capabilities || answers.additionalCapabilities?.join(',');
        options.priority = answers.priority;
      }

      // Validate and normalize agent type
      const normalizedType = normalizeAgentType(type);

      // Parse capabilities
      const additionalCapabilities: AgentCapability[] = [];
      if (options.capabilities) {
        const capabilityStrings = options.capabilities.split(',').map((s: string) => s.trim());
        capabilityStrings.forEach((cap: string) => {
          // Add basic validation - we'll enhance this later
          if (cap && typeof cap === 'string') {
            additionalCapabilities.push(cap as AgentCapability);
          }
        });
      }

      const batchSize = parseInt(options.batch);
      const agents = [];

      spinner.text = `Spawning ${batchSize} agent(s) of type ${normalizedType}...`;

      // Spawn agents
      for (let i = 0; i < batchSize; i++) {
        const agentOptions = {
          name: options.name ? `${options.name}${batchSize > 1 ? `-${i + 1}` : ''}` : undefined,
          capabilities: additionalCapabilities,
          priority: options.priority,
          metadata: {
            swarmId,
            autoAssign: options.autoAssign,
            spawnedAt: new Date().toISOString(),
          },
        };

        const agent = await agentFactory.spawnAgent(normalizedType, agentOptions);
        agents.push(agent);

        logger.info('Agent spawned', {
          id: agent.id,
          type: agent.type,
          name: agent.name,
          swarmId,
          capabilities: agent.capabilities.length,
        });
      }

      spinner.succeed(`Successfully spawned ${agents.length} agent(s)`);

      // Display agent information
      console.log('\n🤖 Agent Details:');
      agents.forEach((agent, index) => {
        console.log(`\n  Agent ${index + 1}:`);
        console.log(`    ID: ${agent.id}`);
        console.log(`    Type: ${agent.type}`);
        console.log(`    Name: ${agent.name}`);
        console.log(`    Capabilities: ${agent.capabilities.join(', ')}`);
        console.log(`    Priority: ${agent.priority}`);
        console.log(`    Status: ${agent.status}`);
      });

      // Show next steps
      console.log('\n📋 Next Steps:');
      console.log('  • Use `claude-flow hive-mind ps` to view active agents');
      console.log('  • Use `claude-flow hive-mind task create` to assign tasks');
      console.log('  • Use `claude-flow hive-mind status` to monitor swarm health');
    } catch (error) {
      spinner.fail('Agent spawn failed');
      logger.error('Agent spawn error', {
        error: error instanceof Error ? error.message : String(error),
        type,
        options,
      });

      console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));

      if (error instanceof Error && error.message.includes('Invalid agent type')) {
        console.log('\n📝 Available agent types:');
        AGENT_TYPES.forEach((t) => console.log(`  • ${t}`));
      }

      process.exit(1);
    }
  });

// Export for use in other modules
export default spawnCommand;
