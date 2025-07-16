/**
 * Configuration Validation Framework
 *
 * Comprehensive validation system for user configurations with detailed
 * error reporting, suggestions, and automatic fix recommendations.
 */

import type {
  UserConfigurationSchema,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  ValidationRule,
  ValidationSchema} from "./user-configuration-system.js";

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

export class ConfigurationValidator {
  private schema: ValidationSchema;
  private customValidators: Map<string, CustomValidator>;
  private validationCache: Map<string, ValidationResult>;

  constructor() {
    this.schema = this.buildValidationSchema();
    this.customValidators = new Map();
    this.validationCache = new Map();
    this.registerBuiltInValidators();
  }

  /**
   * Validate complete configuration
   */
  validate(config: any): ValidationResult {
    const cacheKey = this.generateCacheKey(config);

    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result = this.performValidation(config);
    this.validationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Validate specific configuration section
   */
  validateSection(section: string, value: any): ValidationResult {
    const sectionSchema = this.schema[section];
    if (!sectionSchema) {
      return {
        _valid: false,
        errors: [
          this.createError(
            section,
            "Unknown configuration section",
            "UNKNOWN_SECTION",
          )],
        warnings: [],
        suggestions: [],
        score: 0
      };
    }

    return this.validateValue(section, value, sectionSchema);
  }

  /**
   * Validate individual rule
   */
  validateRule(rule: ValidationRule, value: any): boolean | string {
    switch (rule.type) {
      case "required":
        return this.validateRequired(value, rule);
      case "min":
        return this.validateMin(value, rule);
      case "max":
        return this.validateMax(value, rule);
      case "pattern":
        return this.validatePattern(value, rule);
      case "custom":
        return this.validateCustom(value, rule);
      default:
        return true;
    }
  }

  /**
   * Get validation schema
   */
  getValidationSchema(): ValidationSchema {
    return { ...this.schema };
  }

  /**
   * Register custom validator
   */
  registerValidator(name: string, validator: CustomValidator): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  private performValidation(
    config: Partial<UserConfigurationSchema>,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Validate structure
    this.validateStructure(config, errors, warnings);

    // Validate each section
    for (const [section, value] of Object.entries(config)) {
      if (value !== undefined) {
        const sectionResult = this.validateSection(
          section as keyof UserConfigurationSchema,
          value,
        );
        errors.push(...sectionResult.errors);
        warnings.push(...sectionResult.warnings);
        suggestions.push(...sectionResult.suggestions);
      }
    }

    // Cross-validation rules
    this.performCrossValidation(config, errors, warnings, suggestions);

    // Generate quality score
    const score = this.calculateQualityScore(config, errors, warnings);

    return {
      _valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score
    };
  }

  private validateStructure(
    config: Partial<UserConfigurationSchema>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Check version
    if (!config._version) {
      errors.push(
        this.createError(
          "version",
          "Configuration version is required",
          "MISSING_VERSION",
        ),
      );
    } else if (!this.isValidVersion(config._version)) {
      errors.push(
        this.createError(
          "version",
          "Invalid version format",
          "INVALID_VERSION",
        ),
      );
    }

    // Check required sections
    const requiredSections = ["codeQuality", "development", "userExperience"];
    for (const section of requiredSections) {
      if (!config[section as keyof UserConfigurationSchema]) {
        warnings.push(
          this.createWarning(
            section,
            `Section '${section}' is recommended but missing`,
            "Consider adding this section for better configuration",
            "medium",
          ),
        );
      }
    }
  }

  private validateValue(
    path: string,
    value: any,
    schemaRule: any,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Type validation
    if (schemaRule.type && !this.validateType(value, schemaRule.type)) {
      errors.push(
        this.createError(
          path,
          `Expected ${schemaRule.type} but got ${typeof value}`,
          "TYPE_MISMATCH",
        ),
      );
    }

    // Required validation
    if (schemaRule.required && (value === undefined || value === null)) {
      errors.push(
        this.createError(path, "This field is required", "REQUIRED_FIELD"),
      );
    }

    // Custom rule validation
    if (schemaRule.rules) {
      for (const rule of schemaRule.rules) {
        const result = this.validateRule(rule, value);
        if (typeof result === "string") {
          errors.push(this.createError(path, result, "RULE_VIOLATION"));
        }
      }
    }

    // Dependencies validation
    if (schemaRule.dependencies) {
      // Check if dependencies are met
      // Implementation would validate dependency relationships
    }

    return {
      _valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score: errors.length === 0 ? 100 : 0
    };
  }

  private performCrossValidation(
    config: Partial<UserConfigurationSchema>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[],
  ): void {
    // Agent count vs. performance settings
    if (
      config.development?.agents?.defaultCount &&
      config.performance?.resources?.maxConcurrentAgents
    ) {
      const agentCount = config.development.agents.defaultCount;
      const maxConcurrent = config.performance.resources.maxConcurrentAgents;

      if (agentCount > maxConcurrent) {
        warnings.push(
          this.createWarning(
            "development.agents.defaultCount",
            "Default agent count exceeds maximum concurrent agents",
            "Consider reducing agent count or increasing max concurrent agents",
            "medium",
          ),
        );
      }
    }

    // Security vs. performance trade-offs
    if (
      config.security?.scanning?.enabled &&
      config.performance?.optimization?.cacheEnabled
    ) {
      if (
        config.security.scanning.severity === "critical" &&
        config.performance.optimization.cacheStrategy === "aggressive"
      ) {
        suggestions.push({
          path: "performance.optimization.cacheStrategy",
          current: "aggressive",
          suggested: "moderate",
          reason: "High security settings may conflict with aggressive caching",
          impact: "Better security compliance with minimal performance impact"
        });
      }
    }

    // Testing configuration consistency
    if (
      config.development?.testing?.coverage?.enabled &&
      config.development?.testing?.framework
    ) {
      const framework = config.development.testing.framework;
      const threshold = config.development.testing.coverage.threshold;

      if (framework === "jest" && threshold && threshold > 95) {
        warnings.push(
          this.createWarning(
            "development.testing.coverage.threshold",
            "Very high coverage threshold may impact development speed",
            "Consider balancing coverage goals with development velocity",
            "low",
          ),
        );
      }
    }

    // Legacy support vs. modern features
    if (
      config.codeQuality?.legacySupport?.enabled &&
      config.codeQuality?.strictness?.global === "strict"
    ) {
      warnings.push(
        this.createWarning(
          "codeQuality.strictness.global",
          "Strict code quality may conflict with legacy support",
          "Consider using moderate strictness with legacy support enabled",
          "medium",
        ),
      );
    }
  }

  private calculateQualityScore(
    config: Partial<UserConfigurationSchema>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): number {
    let score = 100;

    // Deduct points for errors
    score -= errors.length * 10;

    // Deduct points for warnings based on impact
    for (const warning of warnings) {
      switch (warning.impact) {
        case "high":
          score -= 5;
          break;
        case "medium":
          score -= 3;
          break;
        case "low":
          score -= 1;
          break;
      }
    }

    // Bonus points for comprehensive configuration
    if (
      config.codeQuality &&
      config.development &&
      config.userExperience &&
      config.performance &&
      config.security
    ) {
      score += 10;
    }

    // Bonus points for testing configuration
    if (
      config.development?.testing?.coverage?.enabled &&
      config.development?.testing?.coverage?.threshold &&
      config.development.testing.coverage.threshold >= 80
    ) {
      score += 5;
    }

    // Bonus points for security configuration
    if (
      config.security?.scanning?.enabled &&
      config.security?.compliance?.standards?.length
    ) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return (
          typeof value === "object" && value !== null && !Array.isArray(value)
        );
      case "array":
        return Array.isArray(value);
      default:
        return true;
    }
  }

  private validateRequired(value: any, rule: ValidationRule): boolean | string {
    if (value === undefined || value === null || value === "") {
      return rule.message || "This field is required";
    }
    return true;
  }

  private validateMin(value: any, rule: ValidationRule): boolean | string {
    if (typeof value === "number" && value < (rule.value as number)) {
      return rule.message || `Value must be at least ${rule.value}`;
    }
    if (typeof value === "string" && value.length < (rule.value as number)) {
      return rule.message || `Must be at least ${rule.value} characters`;
    }
    if (Array.isArray(value) && value.length < (rule.value as number)) {
      return rule.message || `Must have at least ${rule.value} items`;
    }
    return true;
  }

  private validateMax(value: any, rule: ValidationRule): boolean | string {
    if (typeof value === "number" && value > (rule.value as number)) {
      return rule.message || `Value must be at most ${rule.value}`;
    }
    if (typeof value === "string" && value.length > (rule.value as number)) {
      return rule.message || `Must be at most ${rule.value} characters`;
    }
    if (Array.isArray(value) && value.length > (rule.value as number)) {
      return rule.message || `Must have at most ${rule.value} items`;
    }
    return true;
  }

  private validatePattern(value: any, rule: ValidationRule): boolean | string {
    if (typeof value === "string") {
      const pattern = new RegExp(rule.value as string);
      if (!pattern.test(value)) {
        return rule.message || "Value does not match required pattern";
      }
    }
    return true;
  }

  private validateCustom(value: any, rule: ValidationRule): boolean | string {
    if (rule.validator && typeof rule.validator === "function") {
      const result = rule.validator(value);
      if (typeof result === "string") {
        return result;
      }
      if (!result) {
        return rule.message || "Custom validation failed";
      }
    }
    return true;
  }

  private isValidVersion(version: string): boolean {
    // Semantic version pattern
    const semverPattern = /^\d+\.\d+\.\d+(-[\w\.-]+)?(\+[\w\.-]+)?$/;
    return semverPattern.test(version);
  }

  private createError(
    path: string,
    message: string,
    code: string,
  ): ValidationError {
    return {
      path,
      message,
      severity: "error",
      code,
      fix: this.generateAutoFix(path, code)
    };
  }

  private createWarning(
    path: string,
    message: string,
    recommendation: string,
    impact: "low" | "medium" | "high",
  ): ValidationWarning {
    return {
      path,
      message,
      impact,
      recommendation
    };
  }

  private generateAutoFix(path: string, code: string): string | undefined {
    const fixes: Record<string, string> = {
      MISSING_VERSION: 'Add "version": "2.0.0" to your configuration',
      INVALID_VERSION: 'Use semantic versioning format (e.g., "2.0.0")',
      TYPE_MISMATCH: "Correct the value type according to the schema",
      REQUIRED_FIELD: "Provide a value for this required field"
    };

    return fixes[code];
  }

  private generateCacheKey(config: Partial<UserConfigurationSchema>): string {
    return JSON.stringify(config, Object.keys(config).sort());
  }

  // ============================================================================
  // VALIDATION SCHEMA DEFINITION
  // ============================================================================

  private buildValidationSchema(): ValidationSchema {
    return {
      version: {
        type: "string",
        required: true,
        rules: [
          {
            type: "required",
            message: "Configuration version is required"
          },
          {
            type: "pattern",
            value: "^\\d+\\.\\d+\\.\\d+",
            message: "Version must follow semantic versioning"
          }
        ]
      },
      "codeQuality.solidPrinciples.enabled": {
        type: "boolean",
        required: false,
        rules: []
      },
      "codeQuality.solidPrinciples.strictness": {
        type: "string",
        required: false,
        rules: [
          {
            type: "custom",
            validator: (value: string) =>
              ["lenient", "moderate", "strict", "pedantic"].includes(value),
            message: "Strictness must be one of: lenient, moderate, strict, pedantic"
          }
        ]
      },
      "codeQuality.strictness.global": {
        type: "string",
        required: false,
        rules: [
          {
            type: "custom",
            validator: (value: string) =>
              ["minimal", "relaxed", "moderate", "strict", "pedantic"].includes(
                value
              ),
            message: "Global strictness must be one of: minimal, relaxed, moderate, strict, pedantic"
          }
        ]
      },
      "development.agents.defaultCount": {
        type: "number",
        required: false,
        rules: [
          {
            type: "min",
            value: 1,
            message: "Must have at least 1 agent"
          },
          {
            type: "max",
            value: 20,
            message: "Cannot exceed 20 agents"
          }
        ]
      },
      "development.agents.maxCount": {
        type: "number",
        required: false,
        rules: [
          {
            type: "min",
            value: 1,
            message: "Must have at least 1 max agent"
          },
          {
            type: "max",
            value: 50,
            message: "Cannot exceed 50 max agents"
          }
        ],
        dependencies: ["development.agents.defaultCount"]
      },
      "development.testing.coverage.threshold": {
        type: "number",
        required: false,
        rules: [
          {
            type: "min",
            value: 0,
            message: "Coverage threshold cannot be negative"
          },
          {
            type: "max",
            value: 100,
            message: "Coverage threshold cannot exceed 100%"
          }
        ]
      },
      "performance.resources.maxMemoryMB": {
        type: "number",
        required: false,
        rules: [
          {
            type: "min",
            value: 128,
            message: "Memory must be at least 128MB"
          },
          {
            type: "max",
            value: 8192,
            message: "Memory cannot exceed 8GB"
          }
        ]
      },
      "security.scanning.severity": {
        type: "string",
        required: false,
        rules: [
          {
            type: "custom",
            validator: (value: string) =>
              ["low", "medium", "high", "critical"].includes(value),
            message: "Security severity must be one of: low, medium, high, critical"
          }
        ]
      }
    };
  }

  private registerBuiltInValidators(): void {
    // Agent count consistency validator
    this.registerValidator("agentCountConsistency", {
      validate: (config: Partial<UserConfigurationSchema>) => {
        const defaultCount = config.development?.agents?.defaultCount;
        const maxCount = config.development?.agents?.maxCount;

        if (defaultCount && maxCount && defaultCount > maxCount) {
          return {
            valid: false,
            message: "Default agent count cannot exceed maximum agent count"
          };
        }

        return { valid: true };
      },
      dependencies: [
        "development.agents.defaultCount",
        "development.agents.maxCount"
      ]
    });

    // Performance consistency validator
    this.registerValidator("performanceConsistency", {
      validate: (config: Partial<UserConfigurationSchema>) => {
        const maxAgents = config.development?.agents?.maxCount;
        const maxConcurrent =
          config.performance?.resources?.maxConcurrentAgents;

        if (maxAgents && maxConcurrent && maxAgents > maxConcurrent * 2) {
          return {
            valid: false,
            message: "Maximum agents significantly exceeds concurrent capacity"
          };
        }

        return { valid: true };
      },
      dependencies: [
        "development.agents.maxCount",
        "performance.resources.maxConcurrentAgents"
      ]
    });
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export interface CustomValidator {
  validate: (
    config: Partial<UserConfigurationSchema>
  ) => ValidationResult | { valid: boolean; message?: string };
  dependencies?: string[];
}

export class ValidationReporter {
  /**
   * Generate detailed validation report
   */
  static generateReport(result: ValidationResult): ValidationReport {
    return {
      summary: {
        valid: result._valid,
        score: result.score,
        totalIssues: result.errors.length + result.warnings.length,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        suggestionCount: result.suggestions.length
      },
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      recommendations: this.generateRecommendations(result),
      nextSteps: this.generateNextSteps(result)
    };
  }

  /**
   * Generate configuration recommendations
   */
  private static generateRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.errors.length > 0) {
      recommendations.push("Fix all configuration errors before proceeding");
    }

    if (result.warnings.length > 3) {
      recommendations.push(
        "Consider addressing high-impact warnings to improve configuration quality",
      );
    }

    if (result.score < 70) {
      recommendations.push(
        "Configuration quality is below recommended threshold - review and improve settings",
      );
    }

    if (result.suggestions.length > 0) {
      recommendations.push(
        "Review optimization suggestions for better performance",
      );
    }

    return recommendations;
  }

  /**
   * Generate next steps based on validation results
   */
  private static generateNextSteps(result: ValidationResult): string[] {
    const steps: string[] = [];

    if (result.errors.length > 0) {
      steps.push("1. Fix all configuration errors");
    }

    if (
      result.warnings.filter((w: ValidationWarning) => w.impact === "high")
        .length > 0
    ) {
      steps.push("2. Address high-impact warnings");
    }

    if (result.suggestions.length > 0) {
      steps.push("3. Review and apply optimization suggestions");
    }

    if (result._valid) {
      steps.push("Configuration is valid and ready to use");
    } else {
      steps.push("4. Re-validate configuration after fixes");
    }

    return steps;
  }
}

export interface ValidationReport {
  summary: {
    valid: boolean;
    score: number;
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    suggestionCount: number;
  };
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  recommendations: string[];
  nextSteps: string[];
}

// ============================================================================
// CONFIGURATION QUALITY METRICS
// ============================================================================

export class ConfigurationQualityAnalyzer {
  /**
   * Analyze configuration completeness
   */
  static analyzeCompleteness(
    config: Partial<UserConfigurationSchema>,
  ): CompletenessAnalysis {
    const sections = [
      "codeQuality",
      "development",
      "project",
      "userExperience",
      "performance",
      "security",
      "advanced"
    ];

    const configuredSections = sections.filter((section) =>
        config[section as keyof UserConfigurationSchema] !== undefined
    );

    const completeness = (configuredSections.length / sections.length) * 100;

    return {
      percentage: Math.round(completeness),
      configuredSections,
      missingSections: sections.filter((section) => !configuredSections.includes(section)),
      recommendations: this.generateCompletenessRecommendations(
        configuredSections,
        sections,
      )
    };
  }

  /**
   * Analyze configuration complexity
   */
  static analyzeComplexity(
    config: Partial<UserConfigurationSchema>,
  ): ComplexityAnalysis {
    let complexity = 0;

    // Agent configuration complexity
    if (config.development?.agents?.customAgentConfigs?.length) {
      complexity += config.development.agents.customAgentConfigs.length * 2;
    }

    // Custom rules complexity
    if (config.codeQuality?.customRules?.rules?.length) {
      complexity += config.codeQuality.customRules.rules.length;
    }

    // Integration complexity
    const integrations = config.project?.integrations;
    if (integrations) {
      Object.values(integrations).forEach((integration) => {
        if (
          integration &&
          typeof integration === "object" &&
          "enabled" in integration &&
          integration.enabled
        ) {
          complexity += 3;
        }
      });
    }

    const level =
      complexity < 10 ? "simple" : complexity < 30 ? "moderate" : "complex";

    return {
      score: complexity,
      level,
      factors: this.identifyComplexityFactors(config),
      recommendations: this.generateComplexityRecommendations(level)
    };
  }

  private static generateCompletenessRecommendations(
    configured: string[],
    all: string[],
  ): string[] {
    const missing = all.filter((section) => !configured.includes(section));
    const recommendations: string[] = [];

    if (missing.includes("security")) {
      recommendations.push("Add security configuration for better protection");
    }

    if (missing.includes("performance")) {
      recommendations.push("Configure performance settings for optimization");
    }

    if (missing.includes("userExperience")) {
      recommendations.push(
        "Set user experience preferences for better workflow",
      );
    }

    return recommendations;
  }

  private static identifyComplexityFactors(
    config: Partial<UserConfigurationSchema>,
  ): string[] {
    const factors: string[] = [];

    if (config.development?.agents?.customAgentConfigs?.length) {
      factors.push("Custom agent configurations");
    }

    if (config.codeQuality?.customRules?.enabled) {
      factors.push("Custom quality rules");
    }

    if (config.project?.integrations) {
      const enabledIntegrations = Object.entries(config.project.integrations)
        .filter(([_, integration]) =>
            integration &&
            typeof integration === "object" &&
            "enabled" in integration &&
            integration.enabled,
        )
        .map(([name]) => name);

      if (enabledIntegrations.length > 0) {
        factors.push(
          `Multiple integrations: ${enabledIntegrations.join(", ")}`,
        );
      }
    }

    return factors;
  }

  private static generateComplexityRecommendations(level: string): string[] {
    switch (level) {
      case "simple":
        return ["Consider adding more features as your project grows"];
      case "moderate":
        return ["Good balance of features and simplicity"];
      case "complex":
        return [
          "Consider using presets to simplify configuration",
          "Review if all complexity is necessary",
          "Document complex configurations for team members"
        ];
      default:
        return [];
    }
  }
}

export interface CompletenessAnalysis {
  percentage: number;
  configuredSections: string[];
  missingSections: string[];
  recommendations: string[];
}

export interface ComplexityAnalysis {
  score: number;
  level: "simple" | "moderate" | "complex";
  factors: string[];
  recommendations: string[];
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

// Note: Classes are already exported above with their declarations
// Removing duplicate exports to avoid conflicts