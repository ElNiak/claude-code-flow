/**
 * Comprehensive validation framework for hallucination prevention
 */

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import { TaskValidator } from "../../../src/verification/task-validator";
import { TodoWriteValidator } from "../../../src/verification/todowrite-validator";
import { VerificationEngine } from "../../../src/verification/verification-engine";
import {
	EDGE_CASE_DATASET,
	getAllTestSamples,
	getHallucinationSamples,
	getValidSamples,
	HALLUCINATION_DATASET,
	HALLUCINATION_PATTERNS,
	TASK_VALIDATION_DATASET,
	TODO_VALIDATION_DATASET,
	VALID_CODE_DATASET,
} from "../datasets/test-datasets";

describe("Hallucination Prevention Validation Framework", () => {
	let verificationEngine: VerificationEngine;
	let todoValidator: TodoWriteValidator;
	let taskValidator: TaskValidator;

	// Test metrics tracking
	let testMetrics = {
		truePositives: 0,
		trueNegatives: 0,
		falsePositives: 0,
		falseNegatives: 0,
		totalTests: 0,
		startTime: 0,
		endTime: 0,
	};

	beforeEach(() => {
		verificationEngine = new VerificationEngine();
		todoValidator = new TodoWriteValidator(verificationEngine);
		taskValidator = new TaskValidator(verificationEngine);

		// Reset metrics
		testMetrics = {
			truePositives: 0,
			trueNegatives: 0,
			falsePositives: 0,
			falseNegatives: 0,
			totalTests: 0,
			startTime: performance.now(),
			endTime: 0,
		};
	});

	afterEach(() => {
		testMetrics.endTime = performance.now();

		// Calculate and log final metrics
		const accuracy =
			(testMetrics.truePositives + testMetrics.trueNegatives) /
			testMetrics.totalTests;
		const precision =
			testMetrics.truePositives /
			(testMetrics.truePositives + testMetrics.falsePositives);
		const recall =
			testMetrics.truePositives /
			(testMetrics.truePositives + testMetrics.falseNegatives);
		const f1Score = (2 * (precision * recall)) / (precision + recall);
		const falsePositiveRate =
			testMetrics.falsePositives /
			(testMetrics.falsePositives + testMetrics.trueNegatives);
		const falseNegativeRate =
			testMetrics.falseNegatives /
			(testMetrics.falseNegatives + testMetrics.truePositives);

		console.log("\n📊 Test Metrics Summary:");
		console.log(`Accuracy: ${(accuracy * 100).toFixed(2)}%`);
		console.log(`Precision: ${(precision * 100).toFixed(2)}%`);
		console.log(`Recall: ${(recall * 100).toFixed(2)}%`);
		console.log(`F1 Score: ${(f1Score * 100).toFixed(2)}%`);
		console.log(
			`False Positive Rate: ${(falsePositiveRate * 100).toFixed(2)}%`,
		);
		console.log(
			`False Negative Rate: ${(falseNegativeRate * 100).toFixed(2)}%`,
		);
		console.log(`Total Tests: ${testMetrics.totalTests}`);
		console.log(
			`Execution Time: ${(testMetrics.endTime - testMetrics.startTime).toFixed(2)}ms`,
		);
	});

	function updateMetrics(actual: boolean, expected: boolean) {
		testMetrics.totalTests++;

		if (expected === true && actual === true) {
			testMetrics.truePositives++;
		} else if (expected === false && actual === false) {
			testMetrics.trueNegatives++;
		} else if (expected === false && actual === true) {
			testMetrics.falsePositives++;
		} else if (expected === true && actual === false) {
			testMetrics.falseNegatives++;
		}
	}

	describe("Comprehensive Dataset Validation", () => {
		it("should correctly classify all valid code samples", async () => {
			const validSamples = getValidSamples();
			let correctClassifications = 0;

			for (const sample of validSamples) {
				const result = await verificationEngine.verify(sample.code);
				const isClassifiedAsValid = !result.isHallucination;

				updateMetrics(result.isHallucination, sample.isHallucination);

				if (isClassifiedAsValid) {
					correctClassifications++;
				} else {
					console.warn(
						`False positive detected: ${sample.id} - ${sample.code}`,
					);
				}
			}

			const accuracy = correctClassifications / validSamples.length;
			expect(accuracy).toBeGreaterThan(0.98); // > 98% accuracy for valid code
			expect(correctClassifications).toBe(validSamples.length); // All should be correctly classified
		});

		it("should correctly identify all hallucinated code samples", async () => {
			const hallucinationSamples = getHallucinationSamples();
			let correctDetections = 0;

			for (const sample of hallucinationSamples) {
				const result = await verificationEngine.verify(sample.code);
				const isDetectedAsHallucination = result.isHallucination;

				updateMetrics(result.isHallucination, sample.isHallucination);

				if (isDetectedAsHallucination) {
					correctDetections++;
				} else {
					console.warn(
						`False negative detected: ${sample.id} - ${sample.code}`,
					);
				}
			}

			const detectionRate = correctDetections / hallucinationSamples.length;
			expect(detectionRate).toBeGreaterThan(0.95); // > 95% detection rate
			expect(correctDetections).toBeGreaterThan(
				hallucinationSamples.length * 0.95,
			);
		});

		it("should handle edge cases with appropriate confidence levels", async () => {
			for (const sample of EDGE_CASE_DATASET) {
				const result = await verificationEngine.verify(sample.code);

				updateMetrics(result.isHallucination, sample.isHallucination);

				// Edge cases should have lower confidence
				expect(result.confidence).toBeLessThan(0.8);

				// Many edge cases should require manual review
				if (result.confidence < 0.7) {
					expect(result.requiresManualReview).toBe(true);
				}
			}
		});
	});

	describe("Pattern-Based Detection Validation", () => {
		it("should detect hallucination patterns accurately", async () => {
			for (const pattern of HALLUCINATION_PATTERNS) {
				for (const example of pattern.examples) {
					const result = await verificationEngine.verify(example);

					updateMetrics(result.isHallucination, true);

					expect(result.isHallucination).toBe(true);
					expect(result.confidence).toBeGreaterThan(0.8);
					expect(result.reason).toContain(pattern.category);
				}
			}
		});

		it("should correctly weight patterns by severity", async () => {
			const criticalPattern = HALLUCINATION_PATTERNS.find(
				(p) => p.severity === "critical",
			);
			const lowPattern = HALLUCINATION_PATTERNS.find(
				(p) => p.severity === "low",
			);

			if (criticalPattern && lowPattern) {
				const criticalResult = await verificationEngine.verify(
					criticalPattern.examples[0],
				);
				const lowResult = await verificationEngine.verify(
					lowPattern.examples[0],
				);

				expect(criticalResult.confidence).toBeGreaterThan(lowResult.confidence);
			}
		});
	});

	describe("TodoWrite Validation", () => {
		it("should validate legitimate todo items correctly", async () => {
			const validTodos = TODO_VALIDATION_DATASET.validTodos.map(
				(content, i) => ({
					id: `valid-${i}`,
					content,
					status: "pending" as const,
					priority: "medium" as const,
				}),
			);

			const result = await todoValidator.validateTodos(validTodos);

			expect(result.validTodos.length).toBe(validTodos.length);
			expect(result.flaggedTodos.length).toBe(0);
			expect(result.overallValidationScore).toBeGreaterThan(0.8);
		});

		it("should flag hallucinated todo items", async () => {
			const hallucinatedTodos = TODO_VALIDATION_DATASET.hallucinatedTodos.map(
				(content, i) => ({
					id: `hallucinated-${i}`,
					content,
					status: "pending" as const,
					priority: "medium" as const,
				}),
			);

			const result = await todoValidator.validateTodos(hallucinatedTodos);

			expect(result.flaggedTodos.length).toBeGreaterThan(
				hallucinatedTodos.length * 0.9,
			); // > 90% detection
			expect(result.validTodos.length).toBeLessThan(
				hallucinatedTodos.length * 0.1,
			); // < 10% false negatives
		});

		it("should handle edge case todos appropriately", async () => {
			const edgeCaseTodos = TODO_VALIDATION_DATASET.edgeCaseTodos.map(
				(content, i) => ({
					id: `edge-${i}`,
					content,
					status: "pending" as const,
					priority: "medium" as const,
				}),
			);

			const result = await todoValidator.validateTodos(edgeCaseTodos);

			// Edge cases should mostly pass but with lower confidence
			for (const todo of result.validTodos) {
				if (todo.verificationDetails) {
					expect(todo.verificationDetails.confidence).toBeLessThan(0.8);
				}
			}
		});
	});

	describe("Task Instruction Validation", () => {
		it("should validate realistic task instructions", async () => {
			const validInstructions = TASK_VALIDATION_DATASET.validInstructions.map(
				(instruction, i) => ({
					agentType: `agent-${i}`,
					instruction,
					context: `Context for instruction ${i}`,
					tools: ["Read", "Write", "Edit"],
				}),
			);

			const result =
				await taskValidator.validateInstructions(validInstructions);

			expect(result.validInstructions.length).toBe(validInstructions.length);
			expect(result.flaggedInstructions.length).toBe(0);
			expect(result.overallReliabilityScore).toBeGreaterThan(0.8);
		});

		it("should flag impossible task instructions", async () => {
			const hallucinatedInstructions =
				TASK_VALIDATION_DATASET.hallucinatedInstructions.map(
					(instruction, i) => ({
						agentType: `impossible-agent-${i}`,
						instruction,
						context: `Impossible context ${i}`,
						tools: ["ImpossibleTool", "MagicTool"],
					}),
				);

			const result = await taskValidator.validateInstructions(
				hallucinatedInstructions,
			);

			expect(result.flaggedInstructions.length).toBeGreaterThan(
				hallucinatedInstructions.length * 0.9,
			);
			expect(result.validInstructions.length).toBeLessThan(
				hallucinatedInstructions.length * 0.1,
			);
		});

		it("should validate agent coordination strategies", async () => {
			const validStrategies = [
				"hierarchical",
				"mesh",
				"ring",
				"star",
				"parallel",
			];
			const invalidStrategies = [
				"quantum-entangled",
				"telepathic",
				"impossible",
			];

			for (const strategy of validStrategies) {
				const result =
					await taskValidator.validateCoordinationStrategy(strategy);
				expect(result.isValid).toBe(true);
			}

			for (const strategy of invalidStrategies) {
				const result =
					await taskValidator.validateCoordinationStrategy(strategy);
				expect(result.isValid).toBe(false);
			}
		});
	});

	describe("Performance Benchmarks", () => {
		it("should meet false positive rate benchmark", async () => {
			const validSamples = getValidSamples().slice(0, 50); // Test subset for performance
			let falsePositives = 0;

			for (const sample of validSamples) {
				const result = await verificationEngine.verify(sample.code);
				if (result.isHallucination && !sample.isHallucination) {
					falsePositives++;
				}
				updateMetrics(result.isHallucination, sample.isHallucination);
			}

			const falsePositiveRate = falsePositives / validSamples.length;
			expect(falsePositiveRate).toBeLessThan(0.02); // < 2% false positive rate
		});

		it("should meet false negative rate benchmark", async () => {
			const hallucinationSamples = getHallucinationSamples().slice(0, 50); // Test subset
			let falseNegatives = 0;

			for (const sample of hallucinationSamples) {
				const result = await verificationEngine.verify(sample.code);
				if (!result.isHallucination && sample.isHallucination) {
					falseNegatives++;
				}
				updateMetrics(result.isHallucination, sample.isHallucination);
			}

			const falseNegativeRate = falseNegatives / hallucinationSamples.length;
			expect(falseNegativeRate).toBeLessThan(0.005); // < 0.5% false negative rate
		});

		it("should meet performance benchmarks", async () => {
			const testSamples = getAllTestSamples().slice(0, 100);

			const startTime = performance.now();
			const results = await Promise.all(
				testSamples.map((sample) => verificationEngine.verify(sample.code)),
			);
			const endTime = performance.now();

			const totalTime = endTime - startTime;
			const averageTime = totalTime / testSamples.length;

			expect(results.length).toBe(testSamples.length);
			expect(averageTime).toBeLessThan(100); // < 100ms average per verification
			expect(totalTime).toBeLessThan(5000); // < 5 seconds total for 100 verifications
		});
	});

	describe("Real-World Scenario Validation", () => {
		it("should handle mixed validity batches correctly", async () => {
			const mixedBatch = [
				...getValidSamples().slice(0, 25),
				...getHallucinationSamples().slice(0, 25),
			];

			let correctClassifications = 0;
			for (const sample of mixedBatch) {
				const result = await verificationEngine.verify(sample.code);
				updateMetrics(result.isHallucination, sample.isHallucination);

				if (result.isHallucination === sample.isHallucination) {
					correctClassifications++;
				}
			}

			const accuracy = correctClassifications / mixedBatch.length;
			expect(accuracy).toBeGreaterThan(0.95); // > 95% overall accuracy
		});

		it("should provide helpful suggestions for flagged items", async () => {
			const problematicCode = "magicSolver.solveEverything()";
			const result = await verificationEngine.verify(problematicCode);

			expect(result.isHallucination).toBe(true);
			expect(result.suggestions).toBeDefined();
			expect(result.suggestions.length).toBeGreaterThan(0);

			// Suggestions should be realistic alternatives
			for (const suggestion of result.suggestions || []) {
				expect(suggestion).not.toContain("magic");
				expect(suggestion).not.toContain("perfect");
				expect(suggestion).not.toContain("everything");
			}
		});

		it("should handle large-scale validation efficiently", async () => {
			const largeBatch = [
				...Array(200)
					.fill(null)
					.map((_, i) => ({
						id: `large-valid-${i}`,
						code: `function test${i}() { return ${i}; }`,
						isHallucination: false,
						confidence: 0.9,
						category: "generated-valid",
						description: "Generated valid function",
						expectedDetection: false,
					})),
				...Array(50)
					.fill(null)
					.map((_, i) => ({
						id: `large-invalid-${i}`,
						code: `impossibleFunction${i}()`,
						isHallucination: true,
						confidence: 0.9,
						category: "generated-invalid",
						description: "Generated invalid function",
						expectedDetection: true,
					})),
			];

			const startTime = performance.now();
			const results = await Promise.all(
				largeBatch.map((sample) => verificationEngine.verify(sample.code)),
			);
			const endTime = performance.now();

			expect(results.length).toBe(largeBatch.length);
			expect(endTime - startTime).toBeLessThan(10000); // < 10 seconds for 250 items

			// Check accuracy on large batch
			let correctClassifications = 0;
			for (let i = 0; i < largeBatch.length; i++) {
				if (results[i].isHallucination === largeBatch[i].isHallucination) {
					correctClassifications++;
				}
				updateMetrics(
					results[i].isHallucination,
					largeBatch[i].isHallucination,
				);
			}

			const accuracy = correctClassifications / largeBatch.length;
			expect(accuracy).toBeGreaterThan(0.95);
		});
	});

	describe("Error Handling and Resilience", () => {
		it("should handle malformed code gracefully", async () => {
			const malformedCodes = [
				"})({[",
				"function() { unclosed",
				"const x = ;;;",
				"import from nowhere",
				"<<>>invalid syntax",
			];

			for (const code of malformedCodes) {
				const result = await verificationEngine.verify(code);

				expect(result).toBeDefined();
				expect(result.requiresManualReview).toBe(true);
				expect(result.reason).toContain("malformed");
			}
		});

		it("should provide fallback when verification services fail", async () => {
			// Mock service failure
			const originalVerify = verificationEngine.verify;
			verificationEngine.verify = jest
				.fn()
				.mockRejectedValue(new Error("Service unavailable"));

			const result = await verificationEngine.verify("testCode()");

			expect(result.isHallucination).toBe(false); // Fail open
			expect(result.confidence).toBe(0.5); // Neutral confidence
			expect(result.requiresManualReview).toBe(true);
			expect(result.reason).toContain("service unavailable");

			// Restore original method
			verificationEngine.verify = originalVerify;
		});
	});

	describe("Continuous Validation Metrics", () => {
		it("should track and report validation metrics", async () => {
			// This test is automatically tracked by the afterEach hook
			const testSample = getValidSamples()[0];
			const result = await verificationEngine.verify(testSample.code);

			updateMetrics(result.isHallucination, testSample.isHallucination);

			expect(testMetrics.totalTests).toBeGreaterThan(0);
		});

		it("should meet overall benchmark targets", async () => {
			// Run a comprehensive validation on a balanced dataset
			const balancedDataset = [
				...getValidSamples().slice(0, 20),
				...getHallucinationSamples().slice(0, 20),
			];

			for (const sample of balancedDataset) {
				const result = await verificationEngine.verify(sample.code);
				updateMetrics(result.isHallucination, sample.isHallucination);
			}

			// Calculate final metrics (will be logged in afterEach)
			const accuracy =
				(testMetrics.truePositives + testMetrics.trueNegatives) /
				testMetrics.totalTests;
			const falsePositiveRate =
				testMetrics.falsePositives /
				(testMetrics.falsePositives + testMetrics.trueNegatives);
			const falseNegativeRate =
				testMetrics.falseNegatives /
				(testMetrics.falseNegatives + testMetrics.truePositives);

			// Assert benchmark targets
			expect(accuracy).toBeGreaterThan(0.95); // > 95% accuracy
			expect(falsePositiveRate).toBeLessThan(0.02); // < 2% false positive rate
			expect(falseNegativeRate).toBeLessThan(0.005); // < 0.5% false negative rate
		});
	});
});
