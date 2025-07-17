/**
 * Unified Intelligence System - Export Module
 * Provides intrinsic SPARC, SWARM, and HIVE intelligence properties
 */

export { ParallelCoordinationEngine } from "./parallel-coordination.js";
export { StrategicOversightEngine } from "./strategic-oversight.js";
// Core Intelligence Engines
export { StructuredThinkingEngine } from "./structured-thinking.js";
export { IntelligenceSynthesisEngine } from "./synthesis-engine.js";

import { ParallelCoordinationEngine } from "./parallel-coordination.js";
import { StrategicOversightEngine } from "./strategic-oversight.js";
// Import engine classes for internal use
import { StructuredThinkingEngine } from "./structured-thinking.js";
import { IntelligenceSynthesisEngine } from "./synthesis-engine.js";

// Type Exports for SPARC (Structured Thinking)
export type {
	SparcContext,
	SparcPhase,
	SparcState,
	ThinkingPattern,
} from "./structured-thinking.js";

// Import types for internal use
import type {
	SparcContext,
	SparcPhase,
	ThinkingPattern,
} from "./structured-thinking.js";

// Type Exports for SWARM (Parallel Coordination)
export type {
	CoordinationContext,
	CoordinationNode,
	CoordinationStrategy,
	ParallelTask,
	SynchronizationPoint,
} from "./parallel-coordination.js";

// Import types for internal use
import type {
	CoordinationNode,
	CoordinationStrategy,
} from "./parallel-coordination.js";

// Type Exports for HIVE (Strategic Oversight)
export type {
	CollectiveIntelligence,
	ConsensusDecision,
	ConsensusVote,
	Stakeholder,
	StrategicConstraint,
	StrategicContext,
	StrategicObjective,
	StrategicResult,
} from "./strategic-oversight.js";

// Import types for internal use
import type {
	ConsensusDecision,
	ConsensusVote,
	StrategicResult,
} from "./strategic-oversight.js";

// Type Exports for Synthesis
export type {
	ExecutionPlan,
	IntelligenceContext,
	IntelligenceResult,
	QualityAssessment,
	SynthesisConstraint,
	SynthesisObjective,
	SynthesizedInsight,
	SynthesizedOutput,
	SynthesizedRecommendation,
} from "./synthesis-engine.js";

/**
 * Unified Intelligence Factory
 * Creates and manages all intelligence engines
 */
import type { ILogger } from "../../core/logger.js";
import type {
	AgentState,
	SwarmConfig,
	SwarmObjective,
	TaskDefinition,
	TaskResult,
} from "../../swarm/types.js";
// Import types for internal use
import type { IntelligenceResult } from "./synthesis-engine.js";

export class UnifiedIntelligenceSystem {
	private structuredThinking: StructuredThinkingEngine;
	private parallelCoordination: ParallelCoordinationEngine;
	private strategicOversight: StrategicOversightEngine;
	private synthesisEngine: IntelligenceSynthesisEngine;
	private logger: ILogger;

	constructor(logger: ILogger) {
		this.logger = logger;
		this.structuredThinking = new StructuredThinkingEngine(logger);
		this.parallelCoordination = new ParallelCoordinationEngine(logger);
		this.strategicOversight = new StrategicOversightEngine(logger);
		this.synthesisEngine = new IntelligenceSynthesisEngine(logger);

		this.logger.info("Unified Intelligence System initialized", {
			engines: ["SPARC", "SWARM", "HIVE", "Synthesis"],
		});
	}

	/**
	 * Apply unified intelligence to task execution
	 * This is the main entry point for intrinsic intelligence
	 */
	async applyIntelligence(
		task: TaskDefinition,
		agents: AgentState[],
		swarmObjective: SwarmObjective,
		config: Partial<SwarmConfig> = {}
	): Promise<IntelligenceResult> {
		this.logger.info("Applying unified intelligence", {
			taskId: task.id.id,
			agentCount: agents.length,
			objective: swarmObjective.name,
		});

		try {
			// Use synthesis engine to coordinate all intelligence types
			const result = await this.synthesisEngine.synthesizeIntelligence(
				task,
				agents,
				swarmObjective,
				config
			);

			this.logger.info("Unified intelligence applied successfully", {
				taskId: task.id.id,
				confidence: result.metadata.confidence,
				synthesisMode: result.metadata.synthesisMode,
			});

			return result;
		} catch (error) {
			this.logger.error("Unified intelligence application failed", {
				taskId: task.id.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Apply structured thinking (SPARC) specifically
	 */
	async applyStructuredThinking(
		task: TaskDefinition,
		agent: AgentState,
		context?: Partial<SparcContext>
	): Promise<TaskResult> {
		return this.structuredThinking.applyStructuredThinking(
			task,
			agent,
			context
		);
	}

	/**
	 * Apply parallel coordination (SWARM) specifically
	 */
	async applyParallelCoordination(
		task: TaskDefinition,
		agents: AgentState[],
		config?: Partial<SwarmConfig>
	): Promise<TaskResult> {
		return this.parallelCoordination.applyParallelCoordination(
			task,
			agents,
			config
		);
	}

	/**
	 * Apply strategic oversight (HIVE) specifically
	 */
	async applyStrategicOversight(
		swarmObjective: SwarmObjective,
		agents: AgentState[],
		config?: Partial<SwarmConfig>
	): Promise<StrategicResult> {
		return this.strategicOversight.applyStrategicOversight(
			swarmObjective,
			agents,
			config
		);
	}

	/**
	 * Get current state of all intelligence engines
	 */
	getIntelligenceState(): any {
		return {
			structuredThinking: this.structuredThinking.getThinkingState(),
			parallelCoordination: this.parallelCoordination.getCoordinationState(),
			strategicOversight: this.strategicOversight.getStrategicState(),
			synthesis: this.synthesisEngine.getSynthesisState(),
		};
	}

	/**
	 * Get available thinking patterns from SPARC engine
	 */
	getAvailableThinkingPatterns(): ThinkingPattern[] {
		return this.structuredThinking.getAvailablePatterns();
	}

	/**
	 * Get available coordination strategies from SWARM engine
	 */
	getAvailableCoordinationStrategies(): CoordinationStrategy[] {
		return this.parallelCoordination.getAvailableStrategies();
	}

	/**
	 * Get SPARC phases
	 */
	getSparcPhases(): SparcPhase[] {
		return this.structuredThinking.getSparcPhases();
	}

	/**
	 * Get coordination nodes
	 */
	getCoordinationNodes(): CoordinationNode[] {
		return this.parallelCoordination.getCoordinationNodes();
	}

	/**
	 * Propose consensus decision through HIVE engine
	 */
	async proposeConsensusDecision(
		type: ConsensusDecision["type"],
		proposal: any
	): Promise<ConsensusDecision> {
		return this.strategicOversight.proposeConsensusDecision(type, proposal);
	}

	/**
	 * Submit consensus vote through HIVE engine
	 */
	submitConsensusVote(
		decisionId: string,
		agentId: string,
		vote: ConsensusVote
	): void {
		this.strategicOversight.submitConsensusVote(decisionId, agentId, vote);
	}

	/**
	 * Cleanup all intelligence engines
	 */
	cleanup(): void {
		this.strategicOversight.cleanup();
		this.logger.info("Unified Intelligence System cleaned up");
	}
}

/**
 * Intelligence Engine Registry
 * Maps engine types to their implementations
 */
export const INTELLIGENCE_ENGINES = {
	SPARC: "structured-thinking",
	SWARM: "parallel-coordination",
	HIVE: "strategic-oversight",
	SYNTHESIS: "synthesis-engine",
} as const;

/**
 * Intelligence Capabilities Registry
 * Defines what each engine is capable of
 */
export const INTELLIGENCE_CAPABILITIES = {
	[INTELLIGENCE_ENGINES.SPARC]: {
		name: "Structured Thinking (SPARC)",
		description:
			"Systematic problem-solving through Specification, Pseudocode, Architecture, Refinement, and Completion phases",
		strengths: [
			"Quality",
			"Thoroughness",
			"Systematic approach",
			"Complex problem decomposition",
		],
		applicability: [
			"Complex tasks",
			"Quality-critical work",
			"Research and analysis",
			"System design",
		],
		patterns: [
			"analytical_decomposition",
			"creative_exploration",
			"systematic_implementation",
			"iterative_refinement",
		],
	},
	[INTELLIGENCE_ENGINES.SWARM]: {
		name: "Parallel Coordination (SWARM)",
		description:
			"Distributed coordination for parallel task execution with fault tolerance and load balancing",
		strengths: [
			"Scalability",
			"Parallel execution",
			"Resource optimization",
			"Fault tolerance",
		],
		applicability: [
			"Parallelizable tasks",
			"High throughput needs",
			"Resource optimization",
			"Distributed work",
		],
		strategies: [
			"mesh_coordination",
			"hierarchical_coordination",
			"pipeline_coordination",
			"star_coordination",
		],
	},
	[INTELLIGENCE_ENGINES.HIVE]: {
		name: "Strategic Oversight (HIVE)",
		description:
			"Collective intelligence with strategic oversight, consensus building, and stakeholder management",
		strengths: [
			"Strategic alignment",
			"Consensus building",
			"Risk management",
			"Stakeholder focus",
		],
		applicability: [
			"High-stakes projects",
			"Multi-stakeholder environments",
			"Strategic decisions",
			"Long-term objectives",
		],
		features: [
			"consensus_decisions",
			"strategic_objectives",
			"collective_intelligence",
			"risk_assessment",
		],
	},
	[INTELLIGENCE_ENGINES.SYNTHESIS]: {
		name: "Intelligence Synthesis",
		description:
			"Unified synthesis combining all intelligence types for optimal outcomes",
		strengths: [
			"Holistic approach",
			"Best of all engines",
			"Adaptive optimization",
			"Comprehensive analysis",
		],
		applicability: [
			"Complex multi-faceted tasks",
			"Uncertain requirements",
			"Optimization needs",
			"Quality-critical deliverables",
		],
		modes: ["sequential", "parallel", "adaptive"],
	},
} as const;

/**
 * Intelligence Selection Heuristics
 * Helps determine which intelligence approach to use
 */
export const INTELLIGENCE_SELECTION = {
	/**
	 * Select optimal intelligence approach based on task characteristics
	 */
	selectOptimalApproach(
		task: TaskDefinition,
		agents: AgentState[],
		config: Partial<SwarmConfig> = {}
	): string {
		const taskComplexity = this.assessTaskComplexity(task);
		const parallelizability = this.assessParallelizability(task);
		const stakeholderComplexity = this.assessStakeholderComplexity(task);
		const agentCount = agents.length;

		// High complexity + quality focus = SPARC
		if (taskComplexity >= 0.8 && (config.qualityThreshold || 0) >= 0.9) {
			return INTELLIGENCE_ENGINES.SPARC;
		}

		// High parallelizability + multiple agents = SWARM
		if (parallelizability >= 0.7 && agentCount >= 3) {
			return INTELLIGENCE_ENGINES.SWARM;
		}

		// High stakeholder complexity + strategic importance = HIVE
		if (stakeholderComplexity >= 0.7 || task.priority === "critical") {
			return INTELLIGENCE_ENGINES.HIVE;
		}

		// Default to synthesis for balanced approach
		return INTELLIGENCE_ENGINES.SYNTHESIS;
	},

	assessTaskComplexity(task: TaskDefinition): number {
		let score = 0.3; // Base complexity

		if (task.priority === "critical") score += 0.3;
		if (task.description.toLowerCase().includes("complex")) score += 0.2;
		if (task.constraints?.dependencies.length > 3) score += 0.2;

		return Math.min(1, score);
	},

	assessParallelizability(task: TaskDefinition): number {
		let score = 0.5; // Base parallelizability

		const desc = task.description.toLowerCase();
		if (desc.includes("parallel") || desc.includes("batch")) score += 0.3;
		if (desc.includes("sequential") || desc.includes("dependent")) score -= 0.3;

		return Math.max(0, Math.min(1, score));
	},

	assessStakeholderComplexity(task: TaskDefinition): number {
		let score = 0.2; // Base stakeholder complexity

		const desc = task.description.toLowerCase();
		if (desc.includes("stakeholder") || desc.includes("user")) score += 0.3;
		if (desc.includes("strategic") || desc.includes("business")) score += 0.3;
		if (desc.includes("consensus") || desc.includes("approval")) score += 0.2;

		return Math.min(1, score);
	},
} as const;

/**
 * Default export for convenience
 */
export default UnifiedIntelligenceSystem;
