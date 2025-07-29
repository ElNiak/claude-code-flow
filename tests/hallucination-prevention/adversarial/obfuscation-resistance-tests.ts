/**
 * Adversarial testing for obfuscation resistance in hallucination detection
 * Tests the verification engine's ability to detect hallucinations despite obfuscation attempts
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { VerificationService } from "../../../src/cli/commands/qa/core";

interface ObfuscationAttack {
	id: string;
	category: string;
	originalHallucination: string;
	obfuscatedVariants: string[];
	sophisticationLevel: "basic" | "intermediate" | "advanced" | "expert";
	expectedDetection: boolean;
	bypassLikelihood: "low" | "medium" | "high";
	description: string;
}

const obfuscationAttacks: ObfuscationAttack[] = [
	// Variable Substitution Attacks
	{
		id: "var-sub-001",
		category: "variable_substitution",
		originalHallucination: "magicSolver.solveEverything()",
		obfuscatedVariants: [
			"const solver = magicSolver; solver.solveEverything()",
			"const {solveEverything} = magicSolver; solveEverything()",
			"let s = magicSolver; s.solveEverything()",
			"const magic = magicSolver; magic.solveEverything()",
		],
		sophisticationLevel: "intermediate",
		expectedDetection: true,
		bypassLikelihood: "medium",
		description: "Attempts to hide magic solver behind variable aliasing",
	},

	// String Concatenation Attacks
	{
		id: "str-concat-001",
		category: "string_concatenation",
		originalHallucination: "perfectAI.generateCode()",
		obfuscatedVariants: [
			'perfectAI["generate" + "Code"]()',
			'perfectAI[`${"generate"}Code`]()',
			'perfectAI["gene" + "rate" + "Code"]()',
			'const method = "generate" + "Code"; perfectAI[method]()',
		],
		sophisticationLevel: "intermediate",
		expectedDetection: true,
		bypassLikelihood: "medium",
		description: "Uses string concatenation to hide method names",
	},

	// Comment Masking Attacks
	{
		id: "comment-001",
		category: "comment_masking",
		originalHallucination: "impossibleFunction()",
		obfuscatedVariants: [
			"// Industry standard approach\nimpossibleFunction()",
			"impossibleFunction() // Proven in production",
			"/* Used by major companies */ impossibleFunction()",
			"// Best practice implementation\nimpossibleFunction()",
			"impossibleFunction() /* Google certified */",
		],
		sophisticationLevel: "basic",
		expectedDetection: true,
		bypassLikelihood: "low",
		description:
			"Attempts to legitimize impossible functions with authoritative comments",
	},

	// Code Splitting Attacks
	{
		id: "split-001",
		category: "code_splitting",
		originalHallucination: "quantumProcessor.computeInstantly()",
		obfuscatedVariants: [
			"const processor = quantumProcessor;\nprocessor.computeInstantly()",
			"const {computeInstantly} = quantumProcessor;\ncomputeInstantly()",
			"const qp = quantumProcessor;\nconst compute = qp.computeInstantly;\ncompute()",
			"function callQuantum() {\n  return quantumProcessor.computeInstantly();\n}\ncallQuantum()",
		],
		sophisticationLevel: "advanced",
		expectedDetection: true,
		bypassLikelihood: "medium",
		description: "Splits impossible function calls across multiple lines",
	},

	// Semantic Obfuscation Attacks
	{
		id: "semantic-001",
		category: "semantic_obfuscation",
		originalHallucination: "telepathicAPI.readMind()",
		obfuscatedVariants: [
			"cognitiveInterface.accessThoughts()",
			"mindReader.extractConcepts()",
			"thoughtCapture.getBrainwaves()",
			"neuralInterface.readPatterns()",
			"brainAPI.getIntentions()",
		],
		sophisticationLevel: "advanced",
		expectedDetection: true,
		bypassLikelihood: "high",
		description: "Uses alternative terms to describe impossible capabilities",
	},

	// Encoding Attacks
	{
		id: "encoding-001",
		category: "encoding",
		originalHallucination: "miracleWorker.doMagic()",
		obfuscatedVariants: [
			'eval(atob("bWlyYWNsZVdvcmtlci5kb01hZ2ljKCk="))', // base64 encoded
			"eval(String.fromCharCode(109,105,114,97,99,108,101,87,111,114,107,101,114,46,100,111,77,97,103,105,99,40,41))",
			'Function("return miracleWorker.doMagic")()()',
			'new Function("miracleWorker.doMagic()")()',
		],
		sophisticationLevel: "expert",
		expectedDetection: true,
		bypassLikelihood: "high",
		description: "Uses encoding to hide impossible function calls",
	},

	// Indirect Reference Attacks
	{
		id: "indirect-001",
		category: "indirect_reference",
		originalHallucination: "impossibleSolver.solve()",
		obfuscatedVariants: [
			"const solver = window.impossibleSolver; solver.solve()",
			'const solve = Object.getOwnPropertyDescriptor(impossibleSolver, "solve").value; solve()',
			"Reflect.apply(impossibleSolver.solve, impossibleSolver, [])",
			'impossibleSolver["sol" + "ve"].apply(impossibleSolver)',
		],
		sophisticationLevel: "expert",
		expectedDetection: true,
		bypassLikelihood: "high",
		description: "Uses indirect property access to call impossible functions",
	},

	// Social Engineering Attacks
	{
		id: "social-001",
		category: "social_engineering",
		originalHallucination: "perfectOptimizer.optimizePerfectly()",
		obfuscatedVariants: [
			"enterpriseGrade.optimize() // Used by Fortune 500",
			"industryStandard.improve() // Microsoft certified",
			"productionReady.enhance() // Battle-tested",
			"cloudNative.optimize() // AWS recommended",
			"webScale.improve() // Netflix uses this",
		],
		sophisticationLevel: "intermediate",
		expectedDetection: true,
		bypassLikelihood: "medium",
		description: "Uses authority claims to legitimize impossible capabilities",
	},

	// Misdirection Attacks
	{
		id: "misdirect-001",
		category: "misdirection",
		originalHallucination: "autoMagicFixer.fixAll()",
		obfuscatedVariants: [
			"smartTool.analyze(); autoMagicFixer.fixAll(); // Focus on analyze",
			'logger.info("Starting repair"); autoMagicFixer.fixAll()',
			"config.validate(); autoMagicFixer.fixAll(); return true;",
			"try { autoMagicFixer.fixAll(); } catch(e) { /* fallback */ }",
		],
		sophisticationLevel: "intermediate",
		expectedDetection: true,
		bypassLikelihood: "medium",
		description: "Embeds impossible calls in legitimate-looking code",
	},

	// Template Literal Attacks
	{
		id: "template-001",
		category: "template_literals",
		originalHallucination: "superAI.thinkPerfectly()",
		obfuscatedVariants: [
			'superAI[`think${"Perfect"}ly`]()',
			'const action = `think${"Perfect"}ly`; superAI[action]()',
			'eval(`superAI.think${"Perfect"}ly()`)',
			'superAI[`${"think"}${"Perfect"}ly`]()',
		],
		sophisticationLevel: "advanced",
		expectedDetection: true,
		bypassLikelihood: "medium",
		description: "Uses template literals to construct impossible method names",
	},
];

interface SocialEngineeringAttack {
	category: string;
	description: string;
	samples: string[];
	psychologicalTactics: string[];
}

const socialEngineeringAttacks: SocialEngineeringAttack[] = [
	{
		category: "authority_claims",
		description:
			"Uses claims of authority or endorsement to legitimize impossible capabilities",
		samples: [
			"industryStandard.optimize() // Google uses this",
			"enterpriseGrade.solve() // Microsoft certified",
			"webScale.process() // Used by Netflix",
			"cloudNative.enhance() // AWS recommended",
			"aiPowered.think() // OpenAI approved",
		],
		psychologicalTactics: [
			"authority_bias",
			"social_proof",
			"brand_association",
		],
	},
	{
		category: "consensus_manufacturing",
		description: "Creates false sense of widespread adoption",
		samples: [
			"popularFramework.magicSolve() // 90% of developers use this",
			"widelyAdopted.autoFix() // Community favorite",
			"mainstream.perfectCode() // Industry standard",
			"established.miracle() // Proven approach",
			"trending.impossibleTask() // Growing adoption",
		],
		psychologicalTactics: [
			"bandwagon_effect",
			"social_proof",
			"conformity_bias",
		],
	},
	{
		category: "technical_jargon",
		description: "Uses impressive technical terms to hide impossible claims",
		samples: [
			"quantumEntangled.superposition() // Advanced physics",
			"neurallyInspired.consciousness() // Brain-like processing",
			"blockchainPowered.trustless() // Distributed consensus",
			"mlDriven.selfAware() // Deep learning",
			"quantumSupreme.transcend() // Quantum supremacy",
		],
		psychologicalTactics: [
			"complexity_bias",
			"technical_intimidation",
			"expertise_fallacy",
		],
	},
	{
		category: "urgency_pressure",
		description: "Creates false sense of urgency to bypass critical thinking",
		samples: [
			"quickFix.solveNow() // Time-critical solution",
			"instantSolver.immediate() // Zero-delay processing",
			"realTime.perfect() // Microsecond response",
			"emergency.miracle() // Crisis resolution",
			"urgent.autoSolve() // Deadline approaching",
		],
		psychologicalTactics: [
			"urgency_bias",
			"time_pressure",
			"scarcity_illusion",
		],
	},
];

describe("Adversarial Obfuscation Resistance Tests", () => {
	let verificationEngine: VerificationService;
	const attackResults: Map<string, any> = new Map();

	beforeEach(() => {
		verificationEngine = new VerificationService();
		attackResults.clear();
	});

	afterEach(() => {
		// Analyze attack success/failure rates
		const analysis = analyzeAdversarialResults(attackResults);
		console.log("🛡️ Adversarial Resistance Analysis:", analysis);
	});

	describe("Variable Substitution Resistance", () => {
		it("should detect hallucinations despite variable aliasing", async () => {
			const varSubAttacks = obfuscationAttacks.filter(
				(a) => a.category === "variable_substitution",
			);

			for (const attack of varSubAttacks) {
				// First verify the original is detected
				const originalResult = await verificationEngine.verify(
					attack.originalHallucination,
				);
				expect(originalResult.isHallucination).toBe(true);

				// Then test all obfuscated variants
				for (const variant of attack.obfuscatedVariants) {
					const result = await verificationEngine.verify(variant);
					attackResults.set(`${attack.id}-${variant}`, {
						attack,
						variant,
						result,
					});

					// Should still detect as hallucination
					expect(result.isHallucination).toBe(attack.expectedDetection);

					if (attack.expectedDetection) {
						expect(result.confidence).toBeGreaterThan(0.7);
						expect(result.reason).toMatch(/variable|aliasing|obfuscat/i);
					}
				}
			}
		});
	});

	describe("String Concatenation Resistance", () => {
		it("should detect hallucinations despite string obfuscation", async () => {
			const strConcatAttacks = obfuscationAttacks.filter(
				(a) => a.category === "string_concatenation",
			);

			for (const attack of strConcatAttacks) {
				for (const variant of attack.obfuscatedVariants) {
					const result = await verificationEngine.verify(variant);
					attackResults.set(`${attack.id}-${variant}`, {
						attack,
						variant,
						result,
					});

					// Should detect despite string concatenation
					expect(result.isHallucination).toBe(attack.expectedDetection);

					if (attack.expectedDetection) {
						// May have slightly lower confidence due to obfuscation
						expect(result.confidence).toBeGreaterThan(0.6);
					}
				}
			}
		});
	});

	describe("Comment Masking Resistance", () => {
		it("should not be influenced by authoritative comments", async () => {
			const commentAttacks = obfuscationAttacks.filter(
				(a) => a.category === "comment_masking",
			);

			for (const attack of commentAttacks) {
				for (const variant of attack.obfuscatedVariants) {
					const result = await verificationEngine.verify(variant);
					attackResults.set(`${attack.id}-${variant}`, {
						attack,
						variant,
						result,
					});

					// Should detect hallucination regardless of comments
					expect(result.isHallucination).toBe(attack.expectedDetection);

					// Should not be swayed by authority claims in comments
					expect(result.reason).not.toMatch(
						/google|microsoft|proven|certified/i,
					);
					expect(result.confidence).toBeGreaterThan(0.8);
				}
			}
		});
	});

	describe("Semantic Obfuscation Resistance", () => {
		it("should detect impossible capabilities despite alternative terminology", async () => {
			const semanticAttacks = obfuscationAttacks.filter(
				(a) => a.category === "semantic_obfuscation",
			);

			for (const attack of semanticAttacks) {
				for (const variant of attack.obfuscatedVariants) {
					const result = await verificationEngine.verify(variant);
					attackResults.set(`${attack.id}-${variant}`, {
						attack,
						variant,
						result,
					});

					// Should detect impossible capabilities despite terminology
					expect(result.isHallucination).toBe(attack.expectedDetection);

					// May require manual review due to semantic ambiguity
					if (attack.bypassLikelihood === "high") {
						expect(result.requiresManualReview).toBe(true);
					} else {
						expect(result.confidence).toBeGreaterThan(0.7);
					}
				}
			}
		});
	});

	describe("Encoding Attack Resistance", () => {
		it("should handle encoded function calls appropriately", async () => {
			const encodingAttacks = obfuscationAttacks.filter(
				(a) => a.category === "encoding",
			);

			for (const attack of encodingAttacks) {
				for (const variant of attack.obfuscatedVariants) {
					const result = await verificationEngine.verify(variant);
					attackResults.set(`${attack.id}-${variant}`, {
						attack,
						variant,
						result,
					});

					// Encoded calls should trigger security warnings
					expect(result.requiresManualReview).toBe(true);
					expect(result.reason).toMatch(/eval|encoding|security|dynamic/i);

					// Should be flagged as potentially dangerous
					expect(result.securityRisk).toBe(true);
				}
			}
		});
	});

	describe("Social Engineering Resistance", () => {
		it("should resist authority-based social engineering", async () => {
			const authorityAttacks = socialEngineeringAttacks.find(
				(a) => a.category === "authority_claims",
			);

			if (authorityAttacks) {
				for (const sample of authorityAttacks.samples) {
					const result = await verificationEngine.verify(sample);
					attackResults.set(`authority-${sample}`, {
						attack: { category: "authority_claims" },
						variant: sample,
						result,
					});

					// Should detect hallucination despite authority claims
					expect(result.isHallucination).toBe(true);

					// Should not be influenced by brand names in comments
					expect(result.reason).not.toMatch(
						/google|microsoft|netflix|aws|openai/i,
					);
					expect(result.confidence).toBeGreaterThan(0.7);
				}
			}
		});

		it("should resist consensus manufacturing attacks", async () => {
			const consensusAttacks = socialEngineeringAttacks.find(
				(a) => a.category === "consensus_manufacturing",
			);

			if (consensusAttacks) {
				for (const sample of consensusAttacks.samples) {
					const result = await verificationEngine.verify(sample);

					// Should detect hallucination despite popularity claims
					expect(result.isHallucination).toBe(true);

					// Should not be influenced by popularity claims
					expect(result.reason).not.toMatch(/popular|community|90%|standard/i);
					expect(result.confidence).toBeGreaterThan(0.7);
				}
			}
		});

		it("should resist technical jargon intimidation", async () => {
			const jargonAttacks = socialEngineeringAttacks.find(
				(a) => a.category === "technical_jargon",
			);

			if (jargonAttacks) {
				for (const sample of jargonAttacks.samples) {
					const result = await verificationEngine.verify(sample);

					// Should detect impossible capabilities despite impressive terminology
					expect(result.isHallucination).toBe(true);
					expect(result.confidence).toBeGreaterThan(0.6);
				}
			}
		});
	});

	describe("Sophisticated Attack Combinations", () => {
		it("should resist multi-vector obfuscation attacks", async () => {
			const sophisticatedAttacks = [
				// Combination: Variable substitution + string concatenation + comments
				'const solver = magicSolver; // Industry standard\nconst method = "solve" + "Everything";\nsolver[method]();',

				// Combination: Social engineering + semantic obfuscation + misdirection
				'logger.info("Starting optimization"); enterpriseGrade.perfectOptimize(); // Microsoft uses this',

				// Combination: Template literals + authority claims + code splitting
				'const optimizer = industryStandard;\nconst action = `perfect${\"Optimize\"}`;\noptimizer[action](); // Google certified',
			];

			for (const attack of sophisticatedAttacks) {
				const result = await verificationEngine.verify(attack);

				// Should still detect sophisticated attacks
				expect(result.isHallucination).toBe(true);

				// May have lower confidence due to complexity
				expect(result.confidence).toBeGreaterThan(0.5);

				// Should identify multiple attack vectors
				expect(result.reason).toBeTruthy();
				expect(result.requiresManualReview).toBe(true);
			}
		});
	});

	describe("Performance Under Adversarial Load", () => {
		it("should maintain performance when processing adversarial inputs", async () => {
			const allVariants = obfuscationAttacks.flatMap(
				(a) => a.obfuscatedVariants,
			);

			const startTime = performance.now();
			const results = await Promise.all(
				allVariants.map((variant) => verificationEngine.verify(variant)),
			);
			const endTime = performance.now();

			const averageTime = (endTime - startTime) / allVariants.length;

			// Should maintain reasonable performance even with adversarial inputs
			expect(averageTime).toBeLessThan(150); // < 150ms average per adversarial input
			expect(results.length).toBe(allVariants.length);

			// Should successfully process all inputs without errors
			expect(results.every((r) => r !== null && r !== undefined)).toBe(true);
		});
	});

	describe("Attack Pattern Recognition", () => {
		it("should identify and classify attack patterns", async () => {
			// Test pattern recognition across attack categories
			const attacksByCategory = new Map<string, string[]>();

			for (const attack of obfuscationAttacks) {
				if (!attacksByCategory.has(attack.category)) {
					attacksByCategory.set(attack.category, []);
				}
				attacksByCategory
					.get(attack.category)!
					.push(...attack.obfuscatedVariants);
			}

			for (const [category, variants] of attacksByCategory) {
				for (const variant of variants.slice(0, 2)) {
					// Test first 2 from each category
					const result = await verificationEngine.verify(variant);

					// Should identify attack pattern in metadata
					expect(result.attackPatterns).toBeDefined();
					expect(result.attackPatterns).toContain(category);
				}
			}
		});
	});
});

/**
 * Analyze adversarial test results for security insights
 */
function analyzeAdversarialResults(results: Map<string, any>) {
	const analysis = {
		totalAttacks: results.size,
		successfulDefense: 0,
		bypassAttempts: 0,
		categoryBreakdown: {} as Record<
			string,
			{ attempts: number; defended: number }
		>,
		sophisticationImpact: {} as Record<
			string,
			{ attempts: number; defended: number }
		>,
		overallDefenseRate: 0,
	};

	for (const [id, { attack, variant, result }] of results) {
		const category = attack.category || "unknown";
		const sophistication = attack.sophisticationLevel || "unknown";

		// Initialize category tracking
		if (!analysis.categoryBreakdown[category]) {
			analysis.categoryBreakdown[category] = { attempts: 0, defended: 0 };
		}
		if (!analysis.sophisticationImpact[sophistication]) {
			analysis.sophisticationImpact[sophistication] = {
				attempts: 0,
				defended: 0,
			};
		}

		analysis.categoryBreakdown[category].attempts++;
		analysis.sophisticationImpact[sophistication].attempts++;

		// Check if attack was successfully defended against
		if (attack.expectedDetection && result.isHallucination) {
			analysis.successfulDefense++;
			analysis.categoryBreakdown[category].defended++;
			analysis.sophisticationImpact[sophistication].defended++;
		} else if (!attack.expectedDetection && !result.isHallucination) {
			analysis.successfulDefense++;
			analysis.categoryBreakdown[category].defended++;
			analysis.sophisticationImpact[sophistication].defended++;
		} else {
			analysis.bypassAttempts++;
		}
	}

	analysis.overallDefenseRate = analysis.successfulDefense / results.size;

	return analysis;
}
