#!/usr/bin/env node

/**
 * Unified Coordination System Demo
 *
 * This demo shows how to use the new intrinsic coordination system that has
 * SPARC + Swarm + Hive capabilities built-in simultaneously.
 */

import { EventBus } from "../src/core/event-bus.js";
import { Logger } from "../src/core/logger.js";
import {
	AgentType,
	type TaskDefinition,
	type TaskId,
	UnifiedCoordinationSystem,
	type UnifiedCoordinationSystemConfig,
} from "../src/unified/core/index.js";

/**
 * Demo configuration for the unified coordination system
 */
const demoConfig: UnifiedCoordinationSystemConfig = {
	coordinator: {
		enableStructuredThinking: true,
		phaseTimeouts: {
			specification: 5000, // 5 seconds for demo
			pseudocode: 10000, // 10 seconds
			architecture: 15000, // 15 seconds
			refinement: 8000, // 8 seconds
			completion: 5000, // 5 seconds
		},
		refinementThreshold: 0.8,
		learningRate: 0.1,
		consensusThreshold: 0.7,
		coordinationMode: "automatic",
	},

	matrix: {
		dimensions: {
			sparc: {
				enabled: true,
				phaseTransitionThreshold: 0.8,
				qualityThreshold: 0.75,
				refinementRate: 0.1,
			},
			swarm: {
				enabled: true,
				connectionThreshold: 0.6,
				collaborationRange: 3,
				loadBalanceThreshold: 0.8,
			},
			hive: {
				enabled: true,
				emergenceThreshold: 0.7,
				consensusThreshold: 0.7,
				adaptationRate: 0.05,
			},
		},
		matrix: {
			maxNodes: 50,
			maxConnections: 200,
			optimizationFrequency: 10000,
			patternDetectionEnabled: true,
		},
	},

	agentDefaults: {
		sparc: {
			thinkingDepth: 2,
			qualityThreshold: 0.8,
			refinementEnabled: true,
			phaseTimeouts: {
				specification: 5000,
				pseudocode: 10000,
				architecture: 15000,
				refinement: 8000,
				completion: 5000,
			},
		},
		swarm: {
			collaborationEnabled: true,
			maxConnections: 3,
			loadShareThreshold: 0.8,
			coordinationFrequency: 5000,
		},
		hive: {
			collectiveEnabled: true,
			learningRate: 0.1,
			consensusThreshold: 0.7,
			emergenceEnabled: true,
		},
		unified: {
			coordinationMode: "adaptive",
			synergyEnabled: true,
			holisticThinking: true,
		},
	},

	system: {
		maxAgents: 10,
		maxTasks: 50,
		optimizationFrequency: 10000,
		enableMonitoring: true,
		enableLearning: true,
	},
};

/**
 * Main demo function
 */
async function runUnifiedCoordinationDemo(): Promise<void> {
	console.log("🚀 Starting Unified Coordination System Demo");
	console.log("   Intrinsic SPARC + Swarm + Hive coordination in action\n");

	// Create logger and event bus
	const logger = new Logger({ level: "info", format: "simple" });
	const eventBus = new EventBus(logger);

	// Create unified coordination system
	const system = new UnifiedCoordinationSystem(demoConfig, logger, eventBus);

	try {
		// Initialize the system
		console.log("📋 Initializing unified coordination system...");
		await system.initialize();
		console.log("✅ System initialized successfully\n");

		// Create agents with different types and capabilities
		console.log("🤖 Creating unified agents...");

		const architectAgent = await system.createAgent(
			"architect-001",
			"architect",
			{
				sparc: {
					specification: true,
					pseudocode: true,
					architecture: true,
					refinement: true,
					completion: true,
					qualityThreshold: 0.9,
				},
				swarm: {
					collaboration: true,
					taskSharing: true,
					loadBalancing: true,
					faultTolerance: true,
					coordination: true,
					communicationRange: 5,
				},
				hive: {
					collectiveIntelligence: true,
					emergentBehavior: true,
					patternRecognition: true,
					adaptiveLearning: true,
					consensusBuilding: true,
					holisticView: true,
				},
			},
		);

		const coderAgent = await system.createAgent("coder-001", "coder", {
			languages: ["typescript", "javascript", "python"],
			frameworks: ["node.js", "react", "express"],
			domains: ["web-development", "api-development"],
		});

		const analystAgent = await system.createAgent("analyst-001", "analyst", {
			analysis: true,
			research: true,
			domains: ["data-analysis", "performance-analysis"],
		});

		console.log("✅ Created 3 unified agents:");
		console.log("   - architect-001 (System architect with holistic view)");
		console.log("   - coder-001 (Code developer with collaboration focus)");
		console.log("   - analyst-001 (Data analyst with pattern recognition)\n");

		// Create a complex task to demonstrate unified coordination
		console.log("📝 Creating complex task for unified coordination...");

		const taskId: TaskId = {
			id: "demo-task-001",
			swarmId: "demo-swarm",
			sequence: 1,
			priority: 1,
		};

		const complexTask: TaskDefinition = {
			id: taskId,
			type: "development",
			name: "Build Microservice API",
			description:
				"Design and implement a scalable microservice API with authentication, data processing, and monitoring capabilities",

			requirements: {
				capabilities: ["architecture", "coding", "testing", "analysis"],
				tools: ["typescript", "node.js", "express", "postgresql"],
				permissions: ["read", "write", "execute"],
			},

			constraints: {
				dependencies: [],
				dependents: [],
				conflicts: [],
				deadline: new Date(Date.now() + 300000), // 5 minutes from now
			},

			priority: "high",
			input: {
				requirements: [
					"RESTful API design",
					"JWT authentication",
					"Data validation",
					"Error handling",
					"Performance monitoring",
					"Comprehensive testing",
				],
				technologies: [
					"TypeScript",
					"Node.js",
					"Express",
					"PostgreSQL",
					"Jest",
				],
				constraints: [
					"High availability",
					"Scalable architecture",
					"Security best practices",
				],
			},

			instructions: `
        Design and implement a production-ready microservice API that demonstrates:
        1. SPARC structured thinking: Specification → Pseudocode → Architecture → Refinement → Completion
        2. Swarm coordination: Collaborative development with task distribution
        3. Hive intelligence: Collective decision-making and emergent optimizations

        The system should showcase all three paradigms working together seamlessly.
      `,

			context: {
				purpose: "Demonstrate unified coordination capabilities",
				scope: "Complete microservice implementation",
				stakeholders: ["development team", "operations team", "end users"],
			},

			status: "created",
			createdAt: new Date(),
			updatedAt: new Date(),
			attempts: [],
			statusHistory: [],
		};

		console.log('✅ Task created: "Build Microservice API"');
		console.log(
			"   Requires architecture, coding, testing, and analysis capabilities\n",
		);

		// Execute the task using unified coordination
		console.log("⚡ Executing task with unified coordination...");
		console.log("   SPARC: Structured thinking phases");
		console.log("   Swarm: Parallel agent collaboration");
		console.log("   Hive: Collective intelligence and adaptation\n");

		const startTime = Date.now();

		// Execute with balanced strategy (uses all paradigms equally)
		const result = await system.executeTask(
			complexTask,
			"architect-001",
			"balanced",
		);

		const executionTime = Date.now() - startTime;

		// Display results
		console.log("🎉 Task execution completed successfully!\n");

		console.log("📊 Execution Results:");
		console.log(`   ⏱️  Total time: ${executionTime}ms`);
		console.log(`   🎯 Overall quality: ${(result.quality * 100).toFixed(1)}%`);
		console.log(
			`   📈 Completeness: ${(result.completeness * 100).toFixed(1)}%`,
		);
		console.log(`   🎪 Accuracy: ${(result.accuracy * 100).toFixed(1)}%\n`);

		console.log("🧠 SPARC Results (Structured Thinking):");
		console.log(
			`   📋 Phases completed: ${result.sparcResults.phasesCompleted.length}/5`,
		);
		console.log(`   🤔 Decisions made: ${result.sparcResults.decisionsCount}`);
		console.log(
			`   ✨ Refinements applied: ${result.sparcResults.refinementsApplied}`,
		);
		console.log(
			`   🏆 Quality score: ${(result.sparcResults.qualityScore * 100).toFixed(1)}%\n`,
		);

		console.log("🐝 Swarm Results (Parallel Coordination):");
		console.log(
			`   🤝 Collaboration effectiveness: ${(result.swarmResults.collaborationEffectiveness * 100).toFixed(1)}%`,
		);
		console.log(
			`   📡 Coordination events: ${result.swarmResults.coordinationEvents}`,
		);
		console.log(
			`   🔄 Fault recoveries: ${result.swarmResults.faultRecoveryCount}`,
		);
		console.log(
			`   ⚖️  Load distribution: ${Object.keys(result.swarmResults.loadDistribution).length} agents\n`,
		);

		console.log("🌟 Hive Results (Collective Intelligence):");
		console.log(
			`   🚀 Emergent behaviors: ${result.hiveResults.emergentBehaviorsDetected}`,
		);
		console.log(
			`   🎓 Adaptations performed: ${result.hiveResults.adaptationsPerformed}`,
		);
		console.log(
			`   🤝 Consensus achieved: ${(result.hiveResults.consensusAchieved * 100).toFixed(1)}%`,
		);
		console.log(
			`   💡 Collective insights: ${result.hiveResults.collectiveInsights.length}\n`,
		);

		console.log("🎭 Unified Results (Synergistic Integration):");
		console.log(
			`   ⚡ Synergy achieved: ${(result.unifiedResults.synergyAchieved * 100).toFixed(1)}%`,
		);
		console.log(
			`   🔗 Paradigm integration: ${(result.unifiedResults.paradigmIntegration * 100).toFixed(1)}%`,
		);
		console.log(
			`   🌐 Holistic effectiveness: ${(result.unifiedResults.holisticEffectiveness * 100).toFixed(1)}%`,
		);
		console.log(
			`   📚 Learning outcomes: ${result.unifiedResults.learningOutcomes.length}\n`,
		);

		// Show system metrics
		console.log("📈 System Metrics:");
		const systemMetrics = system.getSystemMetrics();
		console.log(
			`   🎯 Coordinator effectiveness: ${(systemMetrics.coordinator.overallEffectiveness * 100).toFixed(1)}%`,
		);
		console.log(
			`   🕸️  Matrix synergy: ${(systemMetrics.matrix.synergy * 100).toFixed(1)}%`,
		);
		console.log(`   🤖 Active agents: ${systemMetrics.agents}`);
		console.log(`   ⚡ Active executions: ${systemMetrics.activeExecutions}\n`);

		// Show coordination recommendations
		console.log("💡 Coordination Recommendations:");
		const recommendations = system.getCoordinationRecommendations();
		if (recommendations.length > 0) {
			recommendations.slice(0, 3).forEach((rec, index) => {
				console.log(
					`   ${index + 1}. ${rec.description} (Priority: ${rec.priority.toFixed(2)})`,
				);
			});
		} else {
			console.log("   No recommendations - system is optimally coordinated");
		}
		console.log();

		// Show artifacts created
		console.log("📦 Generated Artifacts:");
		Object.keys(result.artifacts).forEach((artifact) => {
			console.log(
				`   📄 ${artifact}: ${typeof result.artifacts[artifact] === "object" ? "Complex structure" : result.artifacts[artifact]}`,
			);
		});
		console.log();

		// Show recommendations and next steps
		console.log("🔮 Recommendations:");
		result.recommendations?.forEach((rec, index) => {
			console.log(`   ${index + 1}. ${rec}`);
		});
		console.log();

		console.log("👣 Next Steps:");
		result.nextSteps?.forEach((step, index) => {
			console.log(`   ${index + 1}. ${step}`);
		});
		console.log();

		console.log("✨ Key Achievements:");
		console.log("   🎯 Demonstrated intrinsic multi-paradigm coordination");
		console.log("   🧠 SPARC structured thinking enhanced decision quality");
		console.log("   🐝 Swarm coordination enabled efficient collaboration");
		console.log("   🌟 Hive intelligence provided adaptive optimization");
		console.log("   🎭 Unified approach achieved superior synergy");
		console.log();

		console.log("🎊 Demo completed successfully!");
		console.log("   The unified coordination system seamlessly integrated:");
		console.log("   • Structured thinking (SPARC)");
		console.log("   • Parallel coordination (Swarm)");
		console.log("   • Collective intelligence (Hive)");
		console.log(
			"   All paradigms worked together intrinsically without mode switching.",
		);
	} catch (error) {
		console.error("❌ Demo failed:", error);
		throw error;
	} finally {
		// Cleanup
		console.log("\n🧹 Cleaning up...");
		await system.shutdown();
		console.log("✅ System shutdown complete");
	}
}

/**
 * Run the demo
 */
if (import.meta.url === `file://${process.argv[1]}`) {
	runUnifiedCoordinationDemo()
		.then(() => {
			console.log("\n🎉 Unified Coordination Demo completed successfully!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\n💥 Demo failed:", error);
			process.exit(1);
		});
}

export { runUnifiedCoordinationDemo };
