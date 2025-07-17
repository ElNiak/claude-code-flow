/**
 * Preset Configuration Templates
 *
 * Comprehensive collection of pre-built configuration templates for common
 * development scenarios with intelligent defaults and validation.
 */

import type {
	PresetTemplate,
	UserConfigurationSchema,
	ValidationRule,
	WizardStep,
} from "./user-configuration-system.js";

// ============================================================================
// SOLID PRINCIPLES PRESET
// ============================================================================

export const _solidPrinciplesPreset: PresetTemplate = {
	_meta: {
		name: "solid-principles",
		version: "1.0.0",
		description: "Enforce SOLID principles with configurable strictness levels",
		author: "Claude Flow Team",
		category: "code-quality",
		tags: ["solid", "oop", "design-patterns", "clean-code"],
		compatibility: ["typescript", "javascript", "java", "csharp"],
	},

	config: {
		version: "2.0.0",
		_codeQuality: {
			solidPrinciples: {
				enabled: true,
				_strictness: "moderate",
				_enforceTypes: ["S", "O", "L", "I", "D"],
				customRules: [
					{
						principle: "S",
						description:
							"Single Responsibility Principle - A class should have only one reason to change",
						pattern:
							"class.*{[\\s\\S]*?(?:get|set|private|public|protected)[\\s\\S]*?(?:get|set|private|public|protected)[\\s\\S]*?}",
						severity: "warning",
						autoFix: false,
					},
					{
						principle: "O",
						description:
							"Open/Closed Principle - Software entities should be open for extension, but closed for modification",
						pattern: "extends.*{[\\s\\S]*?(?:override|super)[\\s\\S]*?}",
						severity: "warning",
						autoFix: false,
					},
					{
						principle: "L",
						description:
							"Liskov Substitution Principle - Objects should be replaceable with instances of their subtypes",
						pattern: "instanceof.*?\\?.*?:",
						severity: "warning",
						autoFix: false,
					},
					{
						principle: "I",
						description:
							"Interface Segregation Principle - Many client-specific interfaces are better than one general-purpose interface",
						pattern: "interface.*{[\\s\\S]*?(?:[^;]{20}[\\s\\S]*?){3}",
						severity: "warning",
						autoFix: false,
					},
					{
						principle: "D",
						description:
							"Dependency Inversion Principle - Depend on abstractions, not concretions",
						pattern: "new\\s+[A-Z][a-zA-Z]*\\(",
						severity: "warning",
						autoFix: false,
					},
				],
			},
			_strictness: {
				global: "moderate",
				_fileTypeOverrides: {
					"*.test.ts": "relaxed",
					"*.spec.ts": "relaxed",
					"*.mock.ts": "relaxed",
				},
				rules: {
					typescript: {
						strict: true,
						noImplicitAny: true,
						noImplicitReturns: true,
						noUnusedLocals: true,
						noUnusedParameters: false,
						exactOptionalPropertyTypes: true,
					},
					eslint: {
						extends: [
							"@typescript-eslint/recommended",
							"_plugin: solid/recommended",
						],
						rules: {
							"max-lines-per-function": ["warn", 50],
							complexity: ["warn", 10],
							"max-params": ["warn", 3],
							"prefer-composition-over-inheritance": "warn",
						},
						_customRules: ["solid-principles-checker"],
					},
					_prettier: {
						enforceFormatting: true,
						_configs: {
							singleQuote: true,
							_trailingComma: "es5",
						},
						_onSave: true,
					},
					_security: {
						scanDependencies: true,
						scanCode: true,
						_blockVulnerabilities: true,
						severity: "medium",
					},
				},
			},
			customRules: {
				enabled: true,
				_rules: [
					{
						name: "enforce-single-responsibility",
						description: "Ensures classes have a single responsibility",
						pattern:
							"class\\s+\\w+\\s*{[^}]*(?:function|method)[^}]*(?:function|method)[^}]*}",
						severity: "warning",
						_category: "solid-principles",
						autoFix: false,
					},
					{
						name: "prefer-composition-over-inheritance",
						description: "Encourages composition over inheritance",
						pattern: "class\\s+\\w+\\s+extends\\s+\\w+",
						severity: "info",
						_category: "solid-principles",
						autoFix: false,
					},
				],
				_rulesets: ["solid-principles", "clean-code"],
			},
		},
		_development: {
			agents: {
				defaultCount: 4,
				_maxCount: 8,
				_preferredTypes: ["architect", "coder", "reviewer", "tester"],
				_autoSpawnRules: [
					{
						trigger: "file_type",
						_condition: "*.ts",
						_agents: ["coder", "reviewer"],
						_priority: "high",
					},
					{
						_trigger: "task_complexity",
						_condition: "complexity > medium",
						_agents: ["architect"],
						_priority: "high",
					},
				],
				_customAgentConfigs: [],
			},
			_workflow: {
				defaultTopology: "hierarchical",
				_strategy: "adaptive",
				_parallelExecution: true,
				_autoOptimization: true,
				_failFast: false,
				_rollbackOnError: true,
			},
			testing: {
				framework: "jest",
				_coverage: {
					enabled: true,
					threshold: 80,
					_enforceThreshold: true,
					_excludePatterns: ["*.mock.*", "*.test.*"],
				},
				_testTypes: ["unit", "integration"],
				_autoGenerate: true,
			},
		},
		_userExperience: {
			interface: {
				verbosity: "normal",
				_outputFormat: "colored",
				_progressIndicators: true,
				_interactiveMode: true,
				_confirmBeforeActions: true,
			},
			_notifications: {
				enabled: true,
				_types: ["error", "warning"],
				_channels: ["console"],
				_frequency: "immediate",
			},
			_learning: {
				enabled: true,
				_trackUsagePatterns: true,
				_adaptivePresets: true,
				_suggestOptimizations: true,
				_personalizedRecommendations: true,
			},
		},
	} as any,

	variations: {
		strict: {
			description: "Strict SOLID enforcement with pedantic rules",
			overrides: {
				codeQuality: {
					solidPrinciples: {
						enabled: true,
						strictness: "strict" as const,
						enforceTypes: ["S", "O", "L", "I", "D"],
						_customRules: [],
					},
					legacySupport: {
						enabled: false,
						compatibility: "minimal" as const,
						targetVersions: {
							node: "18+",
							typescript: "4.8+",
							javascript: "es2020" as const,
						},
						allowDeprecated: false,
						polyfillGeneration: false,
					},
					customRules: {
						enabled: true,
						rules: [],
						rulesets: ["solid-principles-strict"],
					},
					strictness: {
						global: "strict" as const,
						fileTypeOverrides: {},
						_rules: {
							typescript: {
								strict: true,
								noImplicitAny: true,
								noImplicitReturns: true,
								noUnusedLocals: true,
								noUnusedParameters: true,
								exactOptionalPropertyTypes: true,
							},
							eslint: {
								extends: ["@typescript-eslint/recommended"],
								rules: {},
								_customRules: [],
							},
							prettier: { enforceFormatting: true, configs: {}, _onSave: true },
							security: {
								scanDependencies: true,
								scanCode: true,
								blockVulnerabilities: true,
								severity: "medium" as const,
							},
						},
					},
				},
			},
		},
		_relaxed: {
			description: "Relaxed SOLID enforcement for legacy codebases",
			overrides: {
				codeQuality: {
					solidPrinciples: {
						enabled: true,
						strictness: "moderate" as const,
						enforceTypes: ["S", "O"],
						_customRules: [],
					},
					legacySupport: {
						enabled: true,
						compatibility: "full" as const,
						targetVersions: {
							node: "14+",
							typescript: "4.0+",
							javascript: "es5" as const,
						},
						allowDeprecated: true,
						polyfillGeneration: true,
					},
					customRules: {
						enabled: false,
						rules: [],
						rulesets: [],
					},
					strictness: {
						global: "relaxed" as const,
						fileTypeOverrides: {},
						_rules: {
							typescript: {
								strict: false,
								noImplicitAny: false,
								noImplicitReturns: false,
								noUnusedLocals: false,
								noUnusedParameters: false,
								exactOptionalPropertyTypes: false,
							},
							eslint: { extends: [], rules: {}, _customRules: [] },
							prettier: {
								enforceFormatting: false,
								configs: {},
								_onSave: false,
							},
							security: {
								scanDependencies: false,
								scanCode: false,
								blockVulnerabilities: false,
								severity: "low" as const,
							},
						},
					},
				},
			},
		},
	},

	requirements: {
		dependencies: ["eslint", "@typescript-eslint/eslint-plugin", "prettier"],
		tools: ["typescript", "jest"],
		environment: {
			node: ">=16.0.0",
			_npm: ">=8.0.0",
		},
	},

	_wizard: {
		enabled: true,
		steps: [
			{
				id: "strictness-level",
				title: "SOLID Principles Strictness",
				description: "How strictly should SOLID principles be enforced?",
				type: "select",
				options: [
					{
						value: "lenient",
						label: "Lenient",
						description:
							"Basic SOLID principle checks with minimal enforcement",
						recommended: false,
					},
					{
						value: "moderate",
						label: "Moderate",
						description: "Balanced enforcement suitable for most projects",
						recommended: true,
					},
					{
						value: "strict",
						label: "Strict",
						description:
							"Comprehensive SOLID enforcement with detailed analysis",
						recommended: false,
					},
				],
				validation: [
					{
						type: "required",
						message: "Please select a strictness level",
					},
				],
			},
			{
				id: "principles-selection",
				title: "Select SOLID Principles",
				description: "Which SOLID principles should be enforced?",
				type: "multi_select",
				options: [
					{
						value: "S",
						label: "Single Responsibility Principle",
						description: "A class should have only one reason to change",
					},
					{
						value: "O",
						label: "Open/Closed Principle",
						description: "Open for extension, closed for modification",
					},
					{
						value: "L",
						label: "Liskov Substitution Principle",
						description:
							"Objects should be replaceable with instances of their subtypes",
					},
					{
						value: "I",
						label: "Interface Segregation Principle",
						description:
							"Many client-specific interfaces are better than one general-purpose interface",
					},
					{
						value: "D",
						label: "Dependency Inversion Principle",
						description: "Depend on abstractions, not concretions",
					},
				],
				validation: [
					{
						type: "required",
						message: "Please select at least one SOLID principle",
					},
				],
			},
		],
	},
};

// ============================================================================
// LEGACY SUPPORT PRESET
// ============================================================================

export const _legacySupportPreset: PresetTemplate = {
	_meta: {
		name: "legacy-support",
		version: "1.0.0",
		description:
			"Maintain compatibility with legacy systems and older codebases",
		author: "Claude Flow Team",
		category: "compatibility",
		tags: ["legacy", "compatibility", "migration", "modernization"],
		compatibility: ["javascript", "typescript", "node", "browser"],
	},

	config: {
		version: "2.0.0",
		_codeQuality: {
			legacySupport: {
				enabled: true,
				_compatibility: "moderate",
				_targetVersions: {
					node: "14.0.0",
					_typescript: "4.0.0",
					_javascript: "es2018",
				},
				_allowDeprecated: true,
				_polyfillGeneration: true,
			},
			_strictness: {
				global: "relaxed",
				_fileTypeOverrides: {
					"*.legacy.js": "minimal",
					"*.old.js": "minimal",
				},
				rules: {
					typescript: {
						strict: false,
						_noImplicitAny: false,
						_noImplicitReturns: false,
						_noUnusedLocals: false,
						_noUnusedParameters: false,
						_exactOptionalPropertyTypes: false,
					},
					eslint: {
						extends: ["eslint:recommended"],
						rules: {
							"no-var": "warn",
							"prefer-const": "warn",
							"no-console": "off",
						},
						_customRules: [],
					},
					_prettier: {
						enforceFormatting: false,
						_configs: {
							semi: true,
							_singleQuote: false,
						},
						_onSave: false,
					},
					_security: {
						scanDependencies: true,
						scanCode: false,
						_blockVulnerabilities: false,
						severity: "low",
					},
				},
			},
		},
		_development: {
			agents: {
				defaultCount: 3,
				_maxCount: 6,
				_preferredTypes: ["coder", "reviewer", "coordinator"],
				_autoSpawnRules: [
					{
						trigger: "file_type",
						_condition: "*.legacy.*",
						_agents: ["coordinator"],
						_priority: "medium",
					},
				],
				_customAgentConfigs: [],
			},
			_workflow: {
				defaultTopology: "ring",
				_strategy: "sequential",
				_parallelExecution: false,
				_autoOptimization: false,
				_failFast: false,
				_rollbackOnError: true,
			},
			testing: {
				framework: "jest",
				_coverage: {
					enabled: true,
					threshold: 60,
					_enforceThreshold: false,
					_excludePatterns: ["*.legacy.*", "vendor/*"],
				},
				_testTypes: ["unit"],
				_autoGenerate: false,
			},
		},
	} as any,

	variations: {
		"es5-only": {
			description: "Maximum compatibility with ES5 environments",
			overrides: {
				codeQuality: {
					solidPrinciples: {
						enabled: true,
						strictness: "moderate" as const,
						enforceTypes: [],
						_customRules: [],
					},
					legacySupport: {
						compatibility: "full",
						enabled: true,
						targetVersions: {
							node: "8.0.0",
							typescript: "3.0.0",
							javascript: "es5",
						},
						allowDeprecated: true,
						polyfillGeneration: true,
					},
					strictness: {
						global: "moderate" as const,
						fileTypeOverrides: {},
						_rules: {
							typescript: {
								strict: false,
								noImplicitAny: false,
								noImplicitReturns: false,
								noUnusedLocals: false,
								noUnusedParameters: false,
								exactOptionalPropertyTypes: false,
							},
							eslint: { extends: [], rules: {}, _customRules: [] },
							prettier: { enforceFormatting: true, configs: {}, _onSave: true },
							security: {
								scanDependencies: true,
								scanCode: true,
								blockVulnerabilities: true,
								severity: "medium",
							},
						},
					},
					customRules: {
						enabled: false,
						rules: [],
						rulesets: [],
					},
				},
			},
		},
		"gradual-modernization": {
			description: "Gradual transition from legacy to modern code",
			overrides: {
				codeQuality: {
					solidPrinciples: {
						enabled: true,
						strictness: "moderate" as const,
						enforceTypes: [],
						_customRules: [],
					},
					legacySupport: {
						enabled: true,
						compatibility: "moderate",
						targetVersions: {
							node: "12.0.0",
							typescript: "4.0.0",
							javascript: "es2018",
						},
						allowDeprecated: true,
						polyfillGeneration: true,
					},
					strictness: {
						global: "moderate",
						fileTypeOverrides: {},
						_rules: {
							typescript: {
								strict: true,
								noImplicitAny: true,
								noImplicitReturns: true,
								noUnusedLocals: false,
								noUnusedParameters: false,
								exactOptionalPropertyTypes: false,
							},
							eslint: {
								extends: ["@typescript-eslint/recommended"],
								rules: {},
								_customRules: [],
							},
							prettier: { enforceFormatting: true, configs: {}, _onSave: true },
							security: {
								scanDependencies: true,
								scanCode: true,
								blockVulnerabilities: true,
								severity: "medium",
							},
						},
					},
					customRules: {
						enabled: false,
						rules: [],
						rulesets: [],
					},
				},
			},
		},
	},

	requirements: {
		dependencies: ["core-js", "regenerator-runtime", "babel-polyfill"],
		tools: ["babel", "webpack"],
		environment: {
			node: ">=8.0.0",
		},
	},

	_wizard: {
		enabled: true,
		steps: [
			{
				id: "target-environment",
				title: "Target Environment",
				description: "What is the oldest environment you need to support?",
				type: "select",
				options: [
					{
						value: "ie11",
						label: "Internet Explorer 11",
						description: "Maximum compatibility including IE11",
					},
					{
						value: "node8",
						label: "Node.js 8+",
						description: "Support Node.js 8 and above",
					},
					{
						value: "node12",
						label: "Node.js 12+",
						description: "Support Node.js 12 and above",
					},
					{
						value: "modern",
						label: "Modern Browsers",
						description: "Support modern browsers only",
					},
				],
			},
			{
				id: "modernization-strategy",
				title: "Modernization Strategy",
				description: "How would you like to approach code modernization?",
				type: "select",
				options: [
					{
						value: "preserve",
						label: "Preserve Legacy",
						description: "Keep existing code as-is, minimal changes",
					},
					{
						value: "gradual",
						label: "Gradual Modernization",
						description:
							"Incrementally modernize while maintaining compatibility",
					},
					{
						value: "aggressive",
						label: "Aggressive Modernization",
						description:
							"Modernize aggressively with polyfills for compatibility",
					},
				],
			},
		],
	},
};

// ============================================================================
// API DEVELOPMENT PRESET
// ============================================================================

export const _apiDevelopmentPreset: PresetTemplate = {
	_meta: {
		name: "api-development",
		version: "1.0.0",
		description:
			"Comprehensive REST API development with authentication, testing, and documentation",
		author: "Claude Flow Team",
		category: "development",
		tags: ["api", "rest", "backend", "authentication", "testing"],
		compatibility: ["node", "typescript", "javascript"],
	},

	config: {
		version: "2.0.0",
		_codeQuality: {
			strictness: {
				global: "strict",
				rules: {
					typescript: {
						strict: true,
						_noImplicitAny: true,
						_noImplicitReturns: true,
						_noUnusedLocals: true,
						_noUnusedParameters: true,
						_exactOptionalPropertyTypes: true,
					},
					eslint: {
						extends: [
							"@typescript-eslint/recommended",
							"_plugin: security/recommended",
						],
						rules: {
							"security/detect-sql-injection": "error",
							"security/detect-object-injection": "error",
							"no-eval": "error",
							"no-implied-eval": "error",
						},
						customRules: ["api-security-checker"],
					},
					security: {
						scanDependencies: true,
						scanCode: true,
						_blockVulnerabilities: true,
						severity: "high",
					},
				},
			},
		},
		_development: {
			agents: {
				defaultCount: 6,
				_maxCount: 10,
				_preferredTypes: [
					"architect",
					"coder",
					"tester",
					"security",
					"reviewer",
					"devops",
				],
				_autoSpawnRules: [
					{
						trigger: "file_type",
						_condition: "*.controller.ts",
						_agents: ["coder", "security"],
						_priority: "high",
					},
					{
						_trigger: "file_type",
						_condition: "*.service.ts",
						_agents: ["coder", "tester"],
						_priority: "high",
					},
					{
						_trigger: "file_type",
						_condition: "*.middleware.ts",
						_agents: ["security", "reviewer"],
						_priority: "high",
					},
				],
				_customAgentConfigs: [
					{
						name: "api-security-specialist",
						type: "security",
						_specialization: [
							"authentication",
							"authorization",
							"input-validation",
						],
						tools: ["owasp-zap", "snyk", "security-scanner"],
						_resources: {
							memory: "high",
							_cpu: "medium",
							_network: "high",
						},
					},
				],
			},
			_workflow: {
				defaultTopology: "hierarchical",
				_strategy: "parallel",
				_parallelExecution: true,
				_autoOptimization: true,
				_failFast: false,
				_rollbackOnError: true,
			},
			testing: {
				framework: "jest",
				_coverage: {
					enabled: true,
					threshold: 85,
					_enforceThreshold: true,
					_excludePatterns: ["*.mock.*", "test-utils/*"],
				},
				_testTypes: ["unit", "integration", "security", "e2e"],
				_autoGenerate: true,
			},
		},
		_project: {
			structure: {
				sourceDir: "src",
				_testDir: "tests",
				_outputDir: "dist",
				_configDir: "config",
				_enforceStructure: true,
				_autoCreateDirectories: true,
			},
			_integrations: {
				git: {
					enabled: true,
					autoCommit: false,
					_autoCommitMessage: "feat: API development changes",
					_branchStrategy: "feature",
					_requireCleanRepo: true,
					_preCommitHooks: ["lint", "test", "security-scan"],
					_postCommitHooks: ["build"],
				},
				_cicd: {
					enabled: true,
					_platform: "github_actions",
					_workflows: ["ci", "security-scan", "deploy"],
					_autoTrigger: true,
					_environments: ["development", "staging", "production"],
				},
				_docker: {
					enabled: true,
					_autoContainerize: true,
					_baseImage: "node:18-alpine",
					_optimizeSize: true,
					_securityScanning: true,
				},
				_monitoring: {
					enabled: true,
					_metrics: ["response-time", "error-rate", "throughput"],
					_alerting: true,
					_dashboards: ["api-performance", "security-overview"],
					_retention: "30d",
				},
			},
		},
		security: {
			scanning: {
				enabled: true,
				_scanTypes: ["vulnerability", "dependency", "code_analysis", "secrets"],
				_severity: "medium",
				_autoFix: true,
				_quarantineSupicious: false,
			},
			_access: {
				allowedCommands: ["npm", "node", "docker", "git"],
				_blockedCommands: ["rm -rf", "sudo", "chmod 777"],
				_fileSystemRestrictions: ["/etc/*", "/usr/*", "/var/*"],
				_networkRestrictions: [],
			},
			_compliance: {
				standards: ["gdpr"],
				_auditLogging: true,
				_encryptionRequired: true,
			},
		},
		_performance: {
			resources: {
				maxMemoryMB: 1024,
				_maxConcurrentAgents: 6,
				_maxParallelTasks: 8,
				_timeoutMs: 300000,
			},
			_optimization: {
				cacheEnabled: true,
				_cacheSizeMB: 256,
				_cacheStrategy: "aggressive",
				_compressionEnabled: true,
				_tokenOptimization: true,
			},
			_monitoring: {
				enabled: true,
				_metricsCollection: true,
				_performanceTracking: true,
				_alertThresholds: [
					{
						metric: "response_time",
						threshold: 500,
						_condition: "above",
						_action: "alert",
					},
					{
						_metric: "error_rate",
						threshold: 5,
						_condition: "above",
						_action: "alert",
					},
				],
			},
		},
	} as any,

	variations: {
		microservices: {
			description: "Optimized for microservices architecture",
			overrides: {
				development: {
					agents: {
						defaultCount: 8,
						maxCount: 12,
						preferredTypes: [
							"architect",
							"coder",
							"devops",
							"tester",
							"security",
						],
						autoSpawnRules: [
							{
								trigger: "file_type",
								condition: "dockerfile",
								agents: ["devops"],
								priority: "medium",
							},
							{
								trigger: "task_complexity",
								condition: "high",
								agents: ["architect"],
								priority: "high",
							},
						],
						customAgentConfigs: [],
					},
					workflow: {
						defaultTopology: "hierarchical",
						strategy: "adaptive",
						parallelExecution: true,
						autoOptimization: true,
						failFast: false,
						rollbackOnError: true,
					},
					testing: {
						framework: "jest",
						coverage: {
							enabled: true,
							threshold: 80,
							enforceThreshold: false,
							excludePatterns: ["node_modules/**"],
						},
						testTypes: ["unit", "integration"],
						autoGenerate: false,
					},
				},
				project: {
					environment: {
						type: "web_app" as const,
						framework: "react",
						language: "typescript",
						buildSystem: "webpack",
						packageManager: "npm" as const,
					},
					structure: {
						sourceDir: "src",
						testDir: "tests",
						outputDir: "dist",
						configDir: "config",
						enforceStructure: true,
						autoCreateDirectories: true,
					},
					integrations: {
						git: {
							enabled: true,
							autoCommit: false,
							autoCommitMessage: "Automated commit",
							branchStrategy: "feature",
							requireCleanRepo: true,
							preCommitHooks: [],
							postCommitHooks: [],
						},
						cicd: {
							enabled: true,
							platform: "github_actions",
							workflows: ["build", "test"],
							autoTrigger: true,
							environments: ["development", "production"],
						},
						docker: {
							enabled: true,
							autoContainerize: true,
							optimizeSize: true,
							baseImage: "node:alpine",
							securityScanning: true,
						},
						monitoring: {
							enabled: true,
							metrics: [
								"response-time",
								"error-rate",
								"throughput",
								"dependency-health",
							],
							alerting: true,
							dashboards: ["basic", "performance"],
							retention: "30d",
						},
					},
				},
			},
		},
		graphql: {
			description: "GraphQL API development configuration",
			overrides: {
				development: {
					agents: {
						defaultCount: 6,
						maxCount: 10,
						preferredTypes: ["architect", "coder", "analyst"],
						autoSpawnRules: [
							{
								trigger: "file_type",
								condition: "graphql",
								agents: ["architect"],
								priority: "medium",
							},
						],
						customAgentConfigs: [
							{
								name: "graphql-specialist",
								type: "architect",
								specialization: ["graphql", "schema-design", "resolvers"],
								tools: ["apollo-server", "graphql-tools"],
								resources: { memory: "medium", cpu: "medium", network: "low" },
							},
						],
					},
					workflow: {
						defaultTopology: "mesh",
						strategy: "parallel",
						parallelExecution: true,
						autoOptimization: true,
						failFast: false,
						rollbackOnError: true,
					},
					testing: {
						framework: "jest",
						coverage: {
							enabled: true,
							threshold: 85,
							enforceThreshold: false,
							excludePatterns: ["node_modules/**"],
						},
						testTypes: ["unit", "integration"],
						autoGenerate: true,
					},
				},
			},
		},
	},

	requirements: {
		dependencies: [
			"express",
			"helmet",
			"cors",
			"express-rate-limit",
			"jsonwebtoken",
			"bcrypt",
			"joi",
			"swagger-jsdoc",
			"swagger-ui-express",
		],
		tools: ["typescript", "jest", "supertest", "nodemon"],
		environment: {
			node: ">=16.0.0",
			_npm: ">=8.0.0",
		},
	},

	_wizard: {
		enabled: true,
		steps: [
			{
				id: "api-type",
				title: "API Type",
				description: "What type of API are you building?",
				type: "select",
				options: [
					{
						value: "rest",
						label: "REST API",
						description: "Traditional RESTful API with HTTP methods",
						recommended: true,
					},
					{
						value: "graphql",
						label: "GraphQL API",
						description: "GraphQL API with flexible queries",
					},
					{
						value: "hybrid",
						label: "Hybrid REST/GraphQL",
						description: "Combination of REST and GraphQL endpoints",
					},
				],
			},
			{
				id: "authentication",
				title: "Authentication Method",
				description: "How will users authenticate with your API?",
				type: "select",
				options: [
					{
						value: "jwt",
						label: "JWT Tokens",
						description: "JSON Web Tokens for stateless authentication",
						recommended: true,
					},
					{
						value: "oauth",
						label: "OAuth 2.0",
						description: "OAuth 2.0 for third-party authentication",
					},
					{
						value: "session",
						label: "Session-based",
						description: "Traditional session-based authentication",
					},
					{
						value: "apikey",
						label: "API Keys",
						description: "Simple API key authentication",
					},
				],
			},
			{
				id: "database",
				title: "Database Type",
				description: "What database will your API use?",
				type: "select",
				options: [
					{
						value: "postgresql",
						label: "PostgreSQL",
						description: "Relational database with advanced features",
					},
					{
						value: "mysql",
						label: "MySQL",
						description: "Popular relational database",
					},
					{
						value: "mongodb",
						label: "MongoDB",
						description: "Document-based NoSQL database",
					},
					{
						value: "redis",
						label: "Redis",
						description: "In-memory key-value store",
					},
				],
			},
			{
				id: "deployment",
				title: "Deployment Environment",
				description: "Where will your API be deployed?",
				type: "select",
				options: [
					{
						value: "docker",
						label: "Docker Containers",
						description: "Containerized deployment with Docker",
						recommended: true,
					},
					{
						value: "serverless",
						label: "Serverless Functions",
						description: "AWS Lambda, Vercel, or similar",
					},
					{
						value: "traditional",
						label: "Traditional Server",
						description: "VPS or dedicated server deployment",
					},
					{
						value: "kubernetes",
						label: "Kubernetes",
						description: "Container orchestration with Kubernetes",
					},
				],
			},
		],
	},
};

// ============================================================================
// QUALITY ASSURANCE PRESET
// ============================================================================

export const _qualityAssurancePreset: PresetTemplate = {
	_meta: {
		name: "quality-assurance",
		version: "1.0.0",
		description:
			"Comprehensive quality assurance with testing, code analysis, and validation",
		author: "Claude Flow Team",
		category: "testing",
		tags: ["qa", "testing", "quality", "validation", "coverage"],
		compatibility: ["typescript", "javascript", "node", "browser"],
	},

	config: {
		version: "2.0.0",
		_codeQuality: {
			strictness: {
				global: "strict",
				rules: {
					typescript: {
						strict: true,
						_noImplicitAny: true,
						_noImplicitReturns: true,
						_noUnusedLocals: true,
						_noUnusedParameters: true,
						_exactOptionalPropertyTypes: true,
					},
					eslint: {
						extends: [
							"@typescript-eslint/recommended",
							"plugin:testing-library/recommended",
							"plugin:jest/recommended",
						],
						rules: {
							"testing-library/await-async-query": "error",
							"testing-library/no-await-sync-query": "error",
							"jest/expect-expect": "error",
							"jest/no-disabled-tests": "warn",
							"jest/no-focused-tests": "error",
						},
						customRules: ["test-quality-checker"],
					},
				},
			},
			customRules: {
				enabled: true,
				_rules: [
					{
						name: "test-coverage-requirement",
						description: "Ensures adequate test coverage for new code",
						pattern: "export.*function|export.*class",
						severity: "error",
						_category: "testing",
					},
					{
						_name: "test-naming-convention",
						description: "Enforces consistent test naming conventions",
						pattern: "describe\\(.*\\)|it\\(.*\\)|test\\(.*\\)",
						severity: "warning",
						_category: "testing",
					},
				],
			},
		},
		_development: {
			agents: {
				defaultCount: 5,
				_maxCount: 8,
				_preferredTypes: [
					"tester",
					"analyst",
					"reviewer",
					"coder",
					"coordinator",
				],
				_autoSpawnRules: [
					{
						trigger: "file_type",
						_condition: "*.test.*",
						_agents: ["tester", "reviewer"],
						_priority: "high",
					},
					{
						_trigger: "file_type",
						_condition: "*.spec.*",
						_agents: ["tester", "reviewer"],
						_priority: "high",
					},
					{
						_trigger: "project_structure",
						_condition: "hasTests",
						_agents: ["analyst"],
						_priority: "medium",
					},
				],
				_customAgentConfigs: [
					{
						name: "test-coverage-specialist",
						type: "analyst",
						_specialization: ["coverage-analysis", "test-quality", "metrics"],
						tools: ["istanbul", "nyc", "jest-coverage"],
						_resources: {
							memory: "high",
							_cpu: "high",
							_network: "low",
						},
					},
				],
			},
			_workflow: {
				defaultTopology: "mesh",
				_strategy: "parallel",
				_parallelExecution: true,
				_autoOptimization: true,
				_failFast: true,
				_rollbackOnError: true,
			},
			testing: {
				framework: "jest",
				_coverage: {
					enabled: true,
					threshold: 95,
					_enforceThreshold: true,
					_excludePatterns: ["*.mock.*", "test-utils/*", "*.d.ts"],
				},
				_testTypes: ["unit", "integration", "e2e", "visual", "performance"],
				_autoGenerate: true,
			},
		},
		performance: {
			monitoring: {
				enabled: true,
				_metricsCollection: true,
				_performanceTracking: true,
				_alertThresholds: [
					{
						metric: "test_execution_time",
						threshold: 30000,
						_condition: "above",
						_action: "warn",
					},
					{
						_metric: "coverage_percentage",
						threshold: 90,
						_condition: "below",
						_action: "alert",
					},
				],
			},
		},
	} as any,

	variations: {
		"tdd-focused": {
			description: "Test-Driven Development focused configuration",
			overrides: {
				development: {
					agents: {
						defaultCount: 4,
						maxCount: 8,
						preferredTypes: ["tester", "coder"],
						autoSpawnRules: [],
						customAgentConfigs: [],
					},
					workflow: {
						defaultTopology: "hierarchical",
						strategy: "adaptive",
						parallelExecution: true,
						autoOptimization: true,
						failFast: false,
						rollbackOnError: true,
					},
					testing: {
						framework: "jest",
						coverage: {
							enabled: true,
							threshold: 98,
							enforceThreshold: true,
							excludePatterns: ["node_modules/**", "dist/**"],
						},
						testTypes: ["unit", "integration"],
						autoGenerate: true,
					},
				},
			},
		},
		"e2e-heavy": {
			description: "End-to-end testing focused configuration",
			overrides: {
				development: {
					agents: {
						defaultCount: 6,
						maxCount: 12,
						preferredTypes: ["tester", "coder", "analyst"],
						autoSpawnRules: [],
						customAgentConfigs: [],
					},
					workflow: {
						defaultTopology: "mesh",
						strategy: "parallel",
						parallelExecution: true,
						autoOptimization: true,
						failFast: false,
						rollbackOnError: true,
					},
					testing: {
						framework: "jest",
						testTypes: ["unit", "integration", "e2e"],
						coverage: {
							enabled: true,
							threshold: 85,
							enforceThreshold: false,
							excludePatterns: ["node_modules/**", "dist/**"],
						},
						autoGenerate: false,
					},
				},
			},
		},
	},

	requirements: {
		dependencies: [
			"jest",
			"@testing-library/jest-dom",
			"@testing-library/react",
			"playwright",
			"cypress",
			"supertest",
		],
		tools: ["typescript", "eslint", "prettier"],
		environment: {
			node: ">=16.0.0",
		},
	},

	_wizard: {
		enabled: true,
		steps: [
			{
				id: "testing-strategy",
				title: "Testing Strategy",
				description: "What is your primary testing approach?",
				type: "select",
				options: [
					{
						value: "pyramid",
						label: "Testing Pyramid",
						description:
							"Many unit tests, some integration tests, few E2E tests",
						recommended: true,
					},
					{
						value: "trophy",
						label: "Testing Trophy",
						description: "Focus on integration tests with unit and E2E support",
					},
					{
						value: "diamond",
						label: "Testing Diamond",
						description: "Heavy focus on integration and E2E tests",
					},
				],
			},
			{
				id: "coverage-target",
				title: "Coverage Target",
				description: "What code coverage percentage do you want to achieve?",
				type: "range",
				options: [
					{ value: 70, label: "70%" },
					{ value: 80, label: "80%" },
					{ value: 90, label: "90%" },
					{ value: 95, label: "95%" },
				],
				validation: [
					{
						type: "min",
						value: 50,
						message: "Coverage should be at least 50%",
					},
					{
						type: "max",
						value: 100,
						message: "Coverage cannot exceed 100%",
					},
				],
			},
		],
	},
};

// ============================================================================
// EXPORT PRESET COLLECTION
// ============================================================================

export const _presetTemplates: Record<string, PresetTemplate> = {
	"solid-principles": _solidPrinciplesPreset,
	"legacy-support": _legacySupportPreset,
	"api-development": _apiDevelopmentPreset,
	"quality-assurance": _qualityAssurancePreset,
};

export const _presetCategories = {
	"code-quality": ["solid-principles"],
	_compatibility: ["legacy-support"],
	development: ["api-development"],
	_testing: ["quality-assurance"],
};

export const _getPresetByName = (name: string): PresetTemplate | undefined => {
	return _presetTemplates[name];
};

export const _getPresetsByCategory = (category: string): PresetTemplate[] => {
	const _presetNames =
		_presetCategories[category as keyof typeof _presetCategories] || [];
	return _presetNames.map((name) => _presetTemplates[name]).filter(Boolean);
};

export const _getAllPresets = (): PresetTemplate[] => {
	return Object.values(_presetTemplates);
};

// ============================================================================
// VALIDATION FRAMEWORK INTEGRATION
// ============================================================================

export const _validatePresetTemplate = (template: PresetTemplate): any => {
	const _errors: string[] = [];
	const _warnings: string[] = [];

	// Validate metadata,
	if (!template._meta.name) {
		_errors.push("Preset must have a name");
	}
	if (!template._meta.version) {
		_errors.push("Preset must have a version");
	}
	if (!template._meta.description) {
		_errors.push("Preset must have a description");
	}

	// Validate wizard steps,
	if (
		template._wizard.enabled &&
		(!template._wizard.steps || template._wizard.steps.length === 0)
	) {
		_warnings.push("Wizard is enabled but has no steps");
	}

	// Validate requirements,
	if (
		!template.requirements.dependencies ||
		template.requirements.dependencies.length === 0
	) {
		_warnings.push("Preset has no dependency requirements");
	}

	return {
		_valid: _errors.length === 0,
		errors: _errors.map((msg) => ({
			_path: "template",
			message: msg,
			_severity: "error" as const,
			_code: "validation",
		})),
		warnings: _warnings.map((msg) => ({
			_path: "template",
			message: msg,
			_impact: "medium" as const,
			_recommendation: "Consider adding missing information",
		})),
		_suggestions: [],
		_score: _errors.length === 0 ? (_warnings.length === 0 ? 100 : 80) : 0,
	};
};

interface ValidationResult {
	_valid: boolean;
	errors: Array<{
		path: string;
		message: string;
		severity: "error";
		code: string;
	}>;
	warnings: Array<{
		path: string;
		message: string;
		impact: "low" | "medium" | "high";
		recommendation: string;
	}>;
	suggestions: any[];
	score: number;
}
