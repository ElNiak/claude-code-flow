import { SwarmCoordinator } from "../coordination/swarm-coordinator.js";
import {
	BaseCommandComponent,
	ComponentMetadata,
	ComponentOptions,
	ComponentResult,
	ExecutionContext,
	ValidationResult,
} from "../core/command-component.js";
import { SwarmMemory } from "../memory/swarm-memory.js";
import { generateId } from "../utils/helpers.js";

/**
 * Swarm Component - Extracted from swarm.ts command
 * Handles swarm initialization and coordination without subprocess calls
 */
export class SwarmComponent extends BaseCommandComponent {
	private swarmCoordinator: SwarmCoordinator | null = null;
	private swarmMemory: SwarmMemory | null = null;

	constructor() {
		super(
			"swarm",
			"Swarm Coordinator",
			"Initialize and manage swarm coordination",
			"coordination",
			[] // No dependencies
		);
	}

	/**
	 * Core execution logic extracted from swarm.ts
	 */
	protected async executeCore(
		context: ExecutionContext,
		options: ComponentOptions
	): Promise<ComponentResult> {
		try {
			// Initialize swarm memory
			this.swarmMemory = new SwarmMemory();
			await this.swarmMemory.initialize();

			// Parse swarm configuration from options
			const swarmConfig = this.parseSwarmConfig(options);

			// Initialize swarm coordinator
			this.swarmCoordinator = new SwarmCoordinator(swarmConfig);

			// Initialize swarm
			await this.swarmCoordinator.start();
			const swarmId = generateId("swarm");

			// Store swarm state in shared context
			context.sharedState.set("swarm:id", swarmId);
			context.sharedState.set("swarm:config", swarmConfig);
			context.sharedState.set("swarm:coordinator", this.swarmCoordinator);
			context.sharedState.set("swarm:memory", this.swarmMemory);

			// Log swarm initialization
			context.logger.info(
				this.infrastructure.outputFormatter.success(
					`Swarm ${swarmId} initialized with ${swarmConfig.maxAgents} agents`
				)
			);

			return this.createSuccessResult(
				{
					swarmId,
					config: swarmConfig,
					status: "initialized",
				},
				["agent-spawn", "task-orchestrate"]
			);
		} catch (error) {
			return this.createErrorResult(error as Error);
		}
	}

	/**
	 * Validate swarm options
	 */
	validate(options: ComponentOptions): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate topology
		if (options.topology) {
			const validTopologies = ["mesh", "hierarchical", "ring", "star"];
			if (!validTopologies.includes(options.topology)) {
				errors.push(
					`Invalid topology: ${options.topology}. Must be one of: ${validTopologies.join(", ")}`
				);
			}
		}

		// Validate max agents
		if (options.maxAgents) {
			if (
				typeof options.maxAgents !== "number" ||
				options.maxAgents < 1 ||
				options.maxAgents > 50
			) {
				errors.push("maxAgents must be a number between 1 and 50");
			}
		}

		// Validate strategy
		if (options.strategy) {
			const validStrategies = ["parallel", "sequential", "adaptive"];
			if (!validStrategies.includes(options.strategy)) {
				errors.push(
					`Invalid strategy: ${options.strategy}. Must be one of: ${validStrategies.join(", ")}`
				);
			}
		}

		// Warning for large swarms
		if (options.maxAgents && options.maxAgents > 20) {
			warnings.push("Large swarms (>20 agents) may impact performance");
		}

		return this.createValidationResult(errors.length === 0, errors, warnings);
	}

	/**
	 * Get component metadata
	 */
	getMetadata(): ComponentMetadata {
		return {
			id: this.id,
			name: this.name,
			description: this.description,
			category: this.category,
			version: "1.0.0",
			author: "Claude Flow Team",
			dependencies: this.dependencies,
			optionalDependencies: [],
			requiredOptions: [],
			optionalOptions: ["topology", "maxAgents", "strategy", "memory"],
		};
	}

	/**
	 * Parse swarm configuration from options
	 */
	private parseSwarmConfig(options: ComponentOptions): SwarmConfig {
		// Note: config.coordination contains different properties (maxRetries, retryDelay, etc.)
		// and does not contain topology, maxAgents, or strategy properties.
		// We use only the options values or defaults.

		return {
			topology: options.topology || "hierarchical",
			maxAgents: options.maxAgents || 8,
			strategy: options.strategy || "parallel",
			memory: options.memory !== false, // Default to true
			hooks: options.hooks !== false, // Default to true
			autoOptimize: options.autoOptimize !== false, // Default to true
			sessionId: options.sessionId || `swarm-${Date.now()}`,
			workingDirectory: options.workingDirectory || process.cwd(),
		};
	}

	/**
	 * Get active swarm coordinator
	 */
	getSwarmCoordinator(): SwarmCoordinator | null {
		return this.swarmCoordinator;
	}

	/**
	 * Get swarm memory
	 */
	getSwarmMemory(): SwarmMemory | null {
		return this.swarmMemory;
	}

	/**
	 * Cleanup swarm resources
	 */
	async cleanup(): Promise<void> {
		if (this.swarmCoordinator) {
			await this.swarmCoordinator.stop();
			this.swarmCoordinator = null;
		}

		if (this.swarmMemory) {
			await this.swarmMemory.shutdown();
			this.swarmMemory = null;
		}
	}
}

/**
 * Swarm configuration interface
 */
export interface SwarmConfig {
	topology: "mesh" | "hierarchical" | "ring" | "star";
	maxAgents: number;
	strategy: "parallel" | "sequential" | "adaptive";
	memory: boolean;
	hooks: boolean;
	autoOptimize: boolean;
	sessionId: string;
	workingDirectory: string;
}
