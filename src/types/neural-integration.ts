/**
 * Neural Integration Types for Advanced Coordination
 *
 * Complex type definitions for neural pattern learning and coordination
 * between Hive Mind, Swarm, and unified systems.
 */

/**
 * Base neural pattern interface
 */
export interface NeuralPattern {
	id: string;
	name: string;
	description?: string;
	type: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Advanced neural pattern types for complex coordination
 */
export interface AdvancedNeuralPattern extends NeuralPattern {
	// Enhanced pattern properties,
	_complexity: number;
	adaptability: number;
	generalizable: boolean;

	// Cross-system integration,
	systemCompatibility: {
		hiveMind: boolean;
		swarmCoordination: boolean;
		unifiedWork: boolean;
		mcpProtocol: boolean;
	};

	// Learning metadata,
	learningHistory: {
		iterations: number;
		improvements: number;
		plateauReached: boolean;
		lastTrainingTime: Date;
	};

	// Performance metrics,
	performance: {
		accuracy: number;
		precision: number;
		recall: number;
		f1Score: number;
		latency: number;
	};
}

/**
 * Neural coordination interface for multi-system learning
 */
export interface NeuralCoordinationEngine {
	// Pattern management,
	patterns: Map<string, AdvancedNeuralPattern>;

	// Training coordination,
	trainPattern(patternId: string, _data: any): Promise<void>;
	evaluatePattern(patternId: string): Promise<number>;
	optimizePattern(patternId: string): Promise<void>;

	// Cross-system integration,
	synchronizePatterns(targetSystem: string): Promise<void>;
	migratePattern(patternId: string, targetSystem: string): Promise<void>;

	// Learning analytics,
	getPerformanceMetrics(): Promise<any>;
	generateRecommendations(): Promise<string[]>;
}

/**
 * Neural learning configuration
 */
export interface NeuralLearningConfig {
	// Learning parameters,
	_learningRate: number;
	batchSize: number;
	epochs: number;
	regularization: number;

	// Optimization settings,
	optimizer: "adam" | "sgd" | "rmsprop";
	lossFunction: "mse" | "crossentropy" | "huber";

	// Coordination settings,
	crossSystemLearning: boolean;
	patternSharing: boolean;
	distributedTraining: boolean;

	// Performance thresholds,
	accuracyThreshold: number;
	convergenceThreshold: number;
	maxTrainingTime: number;
}

/**
 * Learning state management
 */
export interface NeuralLearningState {
	currentEpoch: number;
	currentBatch: number;
	trainingLoss: number;
	validationLoss: number;
	accuracy: number;
	learningRate: number;
	convergenceStatus: "training" | "converged" | "diverged" | "stalled";
	estimatedTimeRemaining: number;
}

/**
 * Neural memory interface for pattern storage
 */
export interface NeuralMemoryInterface {
	// Pattern storage,
	storePattern(pattern: AdvancedNeuralPattern): Promise<void>;
	retrievePattern(patternId: string): Promise<AdvancedNeuralPattern | null>;
	updatePattern(
		patternId: string,
		_updates: Partial<AdvancedNeuralPattern>
	): Promise<void>;
	deletePattern(patternId: string): Promise<void>;

	// Pattern querying,
	findSimilarPatterns(
		pattern: AdvancedNeuralPattern,
		_threshold: number
	): Promise<AdvancedNeuralPattern[]>;
	searchPatterns(_criteria: any): Promise<AdvancedNeuralPattern[]>;

	// Memory optimization,
	compactMemory(): Promise<void>;
	defragmentMemory(): Promise<void>;
	getMemoryStats(): Promise<any>;
}

/**
 * Training data interface
 */
export interface NeuralTrainingData {
	_id: string;
	type: "coordination" | "optimization" | "prediction" | "behavior";
	inputs: any[];
	outputs: any[];
	metadata: {
		source: string;
		quality: number;
		timestamp: Date;
		verified: boolean;
	};
	preprocessing?: {
		normalized: boolean;
		scaled: boolean;
		augmented: boolean;
	};
}

/**
 * Model architecture definition
 */
export interface NeuralArchitecture {
	id: string;
	name: string;
	type: "feedforward" | "recurrent" | "transformer" | "cnn" | "hybrid";

	layers: {
		type: string;
		size: number;
		activation: string;
		dropout?: number;
		regularization?: number;
	}[];

	inputShape: number[];
	outputShape: number[];

	hyperparameters: {
		learningRate: number;
		batchSize: number;
		optimizer: string;
		lossFunction: string;
	};

	performance: {
		accuracy: number;
		trainingTime: number;
		inferenceTime: number;
		memoryUsage: number;
	};
}

/**
 * Ensemble learning interface
 */
export interface NeuralEnsemble {
	models: Map<string, NeuralArchitecture>;
	weights: Map<string, number>;

	// Ensemble operations,
	addModel(model: NeuralArchitecture, weight: number): void;
	removeModel(_modelId: string): void;
	updateWeights(weights: Map<string, number>): void;

	// Prediction,
	predict(input: any): Promise<any>;
	predictWithConfidence(
		input: any
	): Promise<{ _prediction: any; confidence: number }>;

	// Training,
	trainEnsemble(data: NeuralTrainingData[]): Promise<void>;
	evaluateEnsemble(_testData: NeuralTrainingData[]): Promise<any>;
}
