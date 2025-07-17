/**
 * Integration tests for TodoWrite tool with hallucination prevention
 */

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import type { TodoItem, TodoWriteRequest } from "../../../src/types/todo-types";
import { TodoWriteValidator } from "../../../src/verification/todowrite-validator";
import type { VerificationEngine } from "../../../src/verification/verification-engine";

describe("TodoWrite Integration with Hallucination Prevention", () => {
	let todoValidator: TodoWriteValidator;
	let mockVerificationEngine: jest.Mocked<VerificationEngine>;

	beforeEach(() => {
		mockVerificationEngine = {
			verify: jest.fn(),
			verifyCodeSnippet: jest.fn(),
			verifyImplementationClaim: jest.fn(),
			validateCapabilityClaim: jest.fn(),
		} as jest.Mocked<VerificationEngine>;

		todoValidator = new TodoWriteValidator(mockVerificationEngine);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("Todo Content Validation", () => {
		it("should validate todos with legitimate implementation tasks", async () => {
			const validTodos: TodoItem[] = [
				{
					id: "1",
					content: "Implement user authentication using JWT tokens",
					status: "pending",
					priority: "high",
				},
				{
					id: "2",
					content: "Add input validation for user registration form",
					status: "pending",
					priority: "medium",
				},
				{
					id: "3",
					content: "Write unit tests for existing login functionality",
					status: "pending",
					priority: "high",
				},
			];

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: false,
				confidence: 0.9,
				reason: "Standard implementation task",
			});

			const result = await todoValidator.validateTodos(validTodos);

			expect(result.validTodos).toHaveLength(3);
			expect(result.flaggedTodos).toHaveLength(0);
			expect(result.overallValidationScore).toBeGreaterThan(0.8);
		});

		it("should flag todos with impossible AI capabilities", async () => {
			const problematicTodos: TodoItem[] = [
				{
					id: "1",
					content: "Enable quantum computing mode for faster execution",
					status: "pending",
					priority: "high",
				},
				{
					id: "2",
					content: "Implement telepathic user interface",
					status: "pending",
					priority: "medium",
				},
				{
					id: "3",
					content: "Add AI that writes perfect code automatically",
					status: "pending",
					priority: "low",
				},
			];

			mockVerificationEngine.verifyImplementationClaim
				.mockResolvedValueOnce({
					isHallucination: true,
					confidence: 0.95,
					reason:
						"Quantum computing claims are not realistic for typical applications",
				})
				.mockResolvedValueOnce({
					isHallucination: true,
					confidence: 0.98,
					reason:
						"Telepathic interfaces are not possible with current technology",
				})
				.mockResolvedValueOnce({
					isHallucination: true,
					confidence: 0.92,
					reason: "Claims of perfect automated code generation are unrealistic",
				});

			const result = await todoValidator.validateTodos(problematicTodos);

			expect(result.validTodos).toHaveLength(0);
			expect(result.flaggedTodos).toHaveLength(3);
			expect(result.flaggedTodos[0].reason).toContain(
				"Quantum computing claims",
			);
			expect(result.flaggedTodos[1].reason).toContain("Telepathic interfaces");
			expect(result.flaggedTodos[2].reason).toContain(
				"perfect automated code generation",
			);
		});

		it("should handle mixed valid and invalid todos", async () => {
			const mixedTodos: TodoItem[] = [
				{
					id: "1",
					content: "Refactor existing user service to improve performance",
					status: "pending",
					priority: "high",
				},
				{
					id: "2",
					content: "Implement magic auto-debugging that never fails",
					status: "pending",
					priority: "medium",
				},
				{
					id: "3",
					content: "Add error handling to API endpoints",
					status: "pending",
					priority: "high",
				},
			];

			mockVerificationEngine.verifyImplementationClaim
				.mockResolvedValueOnce({
					isHallucination: false,
					confidence: 0.85,
					reason: "Standard refactoring task",
				})
				.mockResolvedValueOnce({
					isHallucination: true,
					confidence: 0.88,
					reason: "Claims of magical never-failing debugging are unrealistic",
				})
				.mockResolvedValueOnce({
					isHallucination: false,
					confidence: 0.9,
					reason: "Standard error handling implementation",
				});

			const result = await todoValidator.validateTodos(mixedTodos);

			expect(result.validTodos).toHaveLength(2);
			expect(result.flaggedTodos).toHaveLength(1);
			expect(result.flaggedTodos[0].originalTodo.id).toBe("2");
			expect(result.flaggedTodos[0].reason).toContain(
				"magical never-failing debugging",
			);
		});
	});

	describe("Code Snippet Detection in Todos", () => {
		it("should validate code snippets within todo descriptions", async () => {
			const todosWithCode: TodoItem[] = [
				{
					id: "1",
					content: "Use fs.readFileSync() to read configuration files",
					status: "pending",
					priority: "medium",
				},
				{
					id: "2",
					content: "Call nonExistentMagicFunction() for data processing",
					status: "pending",
					priority: "high",
				},
			];

			mockVerificationEngine.verifyCodeSnippet
				.mockResolvedValueOnce({
					isHallucination: false,
					confidence: 0.95,
					reason: "fs.readFileSync is a valid Node.js function",
				})
				.mockResolvedValueOnce({
					isHallucination: true,
					confidence: 0.9,
					reason: "nonExistentMagicFunction does not exist",
				});

			const result = await todoValidator.validateTodos(todosWithCode);

			expect(result.validTodos).toHaveLength(1);
			expect(result.flaggedTodos).toHaveLength(1);
			expect(result.flaggedTodos[0].reason).toContain(
				"nonExistentMagicFunction does not exist",
			);
		});

		it("should handle complex code snippets in todo descriptions", async () => {
			const complexTodos: TodoItem[] = [
				{
					id: "1",
					content:
						"Implement: const result = await SwarmCoordinator.initialize({ agents: 5 })",
					status: "pending",
					priority: "high",
				},
			];

			mockVerificationEngine.verifyCodeSnippet.mockResolvedValue({
				isHallucination: false,
				confidence: 0.8,
				reason: "SwarmCoordinator.initialize exists in codebase",
				evidence: ["src/swarm/coordinator.ts"],
			});

			const result = await todoValidator.validateTodos(complexTodos);

			expect(result.validTodos).toHaveLength(1);
			expect(result.validTodos[0].verificationDetails.evidence).toContain(
				"src/swarm/coordinator.ts",
			);
		});
	});

	describe("Batch Todo Validation", () => {
		it("should efficiently validate large batches of todos", async () => {
			const largeBatch: TodoItem[] = Array.from({ length: 50 }, (_, i) => ({
				id: `${i + 1}`,
				content: `Implement feature ${i + 1} using standard practices`,
				status: "pending" as const,
				priority: "medium" as const,
			}));

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: false,
				confidence: 0.85,
				reason: "Standard implementation task",
			});

			const startTime = performance.now();
			const result = await todoValidator.validateTodos(largeBatch);
			const endTime = performance.now();

			expect(result.validTodos).toHaveLength(50);
			expect(result.flaggedTodos).toHaveLength(0);
			expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
		});

		it("should handle validation errors gracefully in batch processing", async () => {
			const todosWithErrors: TodoItem[] = [
				{
					id: "1",
					content: "Valid todo item",
					status: "pending",
					priority: "high",
				},
				{
					id: "2",
					content: "Todo that causes verification error",
					status: "pending",
					priority: "medium",
				},
			];

			mockVerificationEngine.verifyImplementationClaim
				.mockResolvedValueOnce({
					isHallucination: false,
					confidence: 0.9,
					reason: "Valid implementation task",
				})
				.mockRejectedValueOnce(new Error("Verification service error"));

			const result = await todoValidator.validateTodos(todosWithErrors);

			expect(result.validTodos).toHaveLength(1);
			expect(result.errorTodos).toHaveLength(1);
			expect(result.errorTodos[0].error).toContain(
				"Verification service error",
			);
		});
	});

	describe("TodoWrite Tool Integration", () => {
		it("should integrate seamlessly with existing TodoWrite workflow", async () => {
			const todoWriteRequest: TodoWriteRequest = {
				todos: [
					{
						id: "1",
						content: "Implement REST API endpoints for user management",
						status: "pending",
						priority: "high",
					},
					{
						id: "2",
						content: "Add middleware for request validation",
						status: "pending",
						priority: "medium",
					},
				],
			};

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: false,
				confidence: 0.9,
				reason: "Standard web development task",
			});

			const result =
				await todoValidator.validateTodoWriteRequest(todoWriteRequest);

			expect(result.isValid).toBe(true);
			expect(result.processedTodos).toHaveLength(2);
			expect(result.validationWarnings).toHaveLength(0);
		});

		it("should provide alternative suggestions for flagged todos", async () => {
			const problematicRequest: TodoWriteRequest = {
				todos: [
					{
						id: "1",
						content: "Implement mind-reading user input system",
						status: "pending",
						priority: "high",
					},
				],
			};

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: true,
				confidence: 0.95,
				reason: "Mind-reading technology is not available",
				suggestions: [
					"Implement intelligent input prediction based on user behavior",
					"Add autocomplete functionality for common inputs",
					"Create smart form validation with helpful suggestions",
				],
			});

			const result =
				await todoValidator.validateTodoWriteRequest(problematicRequest);

			expect(result.isValid).toBe(false);
			expect(result.flaggedTodos).toHaveLength(1);
			expect(result.suggestions).toHaveLength(3);
			expect(result.suggestions[0]).toContain("intelligent input prediction");
		});
	});

	describe("Performance and Reliability", () => {
		it("should maintain low false positive rate", async () => {
			const legitimateTodos: TodoItem[] = [
				{
					id: "1",
					content: "Add logging to API endpoints",
					status: "pending",
					priority: "low",
				},
				{
					id: "2",
					content: "Implement user authentication",
					status: "pending",
					priority: "high",
				},
				{
					id: "3",
					content: "Write integration tests",
					status: "pending",
					priority: "medium",
				},
				{
					id: "4",
					content: "Optimize database queries",
					status: "pending",
					priority: "high",
				},
				{
					id: "5",
					content: "Add error handling middleware",
					status: "pending",
					priority: "medium",
				},
			];

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: false,
				confidence: 0.9,
				reason: "Standard development task",
			});

			const result = await todoValidator.validateTodos(legitimateTodos);

			// Should have 0% false positive rate for clearly legitimate todos
			expect(result.flaggedTodos).toHaveLength(0);
			expect(result.validTodos).toHaveLength(5);
		});

		it("should maintain high detection rate for obvious hallucinations", async () => {
			const hallucinatedTodos: TodoItem[] = [
				{
					id: "1",
					content: "Enable time travel debugging feature",
					status: "pending",
					priority: "high",
				},
				{
					id: "2",
					content: "Implement telepathic API communication",
					status: "pending",
					priority: "medium",
				},
				{
					id: "3",
					content: "Add quantum encryption with 100% security",
					status: "pending",
					priority: "high",
				},
				{
					id: "4",
					content: "Create AI that never makes mistakes",
					status: "pending",
					priority: "low",
				},
			];

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: true,
				confidence: 0.95,
				reason: "Claims impossible technological capabilities",
			});

			const result = await todoValidator.validateTodos(hallucinatedTodos);

			// Should catch 100% of obvious hallucinations
			expect(result.flaggedTodos).toHaveLength(4);
			expect(result.validTodos).toHaveLength(0);
		});

		it("should handle edge cases with appropriate confidence levels", async () => {
			const edgeCaseTodos: TodoItem[] = [
				{
					id: "1",
					content: "Implement advanced machine learning optimization",
					status: "pending",
					priority: "medium",
				},
			];

			mockVerificationEngine.verifyImplementationClaim.mockResolvedValue({
				isHallucination: false,
				confidence: 0.6, // Lower confidence for ambiguous case
				reason: "Could be legitimate ML implementation",
				requiresManualReview: true,
			});

			const result = await todoValidator.validateTodos(edgeCaseTodos);

			expect(result.validTodos).toHaveLength(1);
			expect(
				result.validTodos[0].verificationDetails.requiresManualReview,
			).toBe(true);
			expect(result.validTodos[0].verificationDetails.confidence).toBe(0.6);
		});
	});
});
