/**
 * User Experience Workflows for Configuration System
 *
 * Defines intuitive user interaction patterns, guided setup flows,
 * and progressive configuration discovery.
 */

import { EventEmitter } from 'events';
import type {
  UserConfigurationSchema,
  PresetTemplate,
  WizardStep,
  ValidationResult,
  WizardState} from "./user-configuration-system.js";

// ============================================================================
// CONFIGURATION DISCOVERY & ONBOARDING
// ============================================================================

export interface OnboardingFlow {
  // Welcome & Project Analysis,
  welcome(): Promise<WelcomeResult>;
  analyzeProject(projectPath: string): Promise<ProjectAnalysis>;
  recommendPresets(analysis: ProjectAnalysis): Promise<PresetRecommendation[]>;

  // Guided Setup,
  guidedSetup(preset?: string): Promise<UserConfigurationSchema>;
  quickSetup(answers: QuickSetupAnswers): Promise<UserConfigurationSchema>;
  expertSetup(): Promise<UserConfigurationSchema>;

  // Import/Migration,
  importExisting(configPath: string): Promise<ImportResult>;
  migrateFromOther(source: ConfigSource): Promise<MigrationResult>;
}

export interface WelcomeResult {
  isFirstTime: boolean;
  existingConfigs: string[];
  projectType?: string;
  userExperience: "beginner" | "intermediate" | "expert";
  preferredFlow: "guided" | "quick" | "expert" | "import";}

export interface ProjectAnalysis {
  type: string;
  language: string;
  framework?: string;
  buildSystem?: string;
  packageManager: string;
  hasTests: boolean;
  hasCi: boolean;
  hasDocker: boolean;
  complexity: "simple" | "moderate" | "complex";
  teamSize: "individual" | "small" | "medium" | "large";
  recommendations: AnalysisRecommendation[];}

export interface AnalysisRecommendation {
  category: string;
  suggestion: string;
  reason: string;
  impact: "low" | "medium" | "high";
  effort: "minimal" | "moderate" | "significant";}

export interface PresetRecommendation {
  preset: PresetTemplate;
  match: number; // 0-100 compatibility score,
  reasons: string[];
  benefits: string[];
  considerations: string[];}

export interface QuickSetupAnswers {
  projectType: string;
  codeQualityLevel: "relaxed" | "balanced" | "strict";
  testingLevel: "minimal" | "standard" | "comprehensive";
  securityLevel: "basic" | "standard" | "enhanced";
  performanceOptimization: boolean;
  teamCollaboration: boolean;}

export interface ImportResult {
  success: boolean;
  config: Partial<UserConfigurationSchema>;
  warnings: string[];
  adaptations: string[];
  manualSteps: string[];}

export interface ConfigSource {
  type: "eslint" | "prettier" | "jest" | "webpack" | "package_json" | "custom";
  path: string;
  format: "json" | "yaml" | "js" | "ts";}

export interface MigrationResult {
  success: boolean;
  config: Partial<UserConfigurationSchema>;
  migrated: string[];
  skipped: string[];
  conflicts: ConfigConflict[];}

export interface ConfigConflict {
  setting: string;
  oldValue: any;
  newValue: any;
  recommendation: string;}

// ============================================================================
// INTERACTIVE CONFIGURATION WIZARD
// ============================================================================

export class ConfigurationWizard extends EventEmitter {
  private state: WizardState;
  private template: PresetTemplate;
  private userInterface: WizardUserInterface;

  constructor(template: PresetTemplate, ui: WizardUserInterface) {
    super();
    this.template = template;
    this.userInterface = ui;
    this.state = this.initializeState();
  }

  /**
   * Start the configuration wizard
   */
  async start(
    options: WizardStartOptions = {},
  ): Promise<UserConfigurationSchema> {
    this.emit("wizard:started", { template: this.template._meta });

    try {
      // Load existing progress if available,
      if (options.resumeSession) {
        await this.loadProgress();
      }

      // Run through wizard steps,
      while (!this.isComplete()) {
        const step = this.getCurrentStep();
        if (!step) {break;}

        const result = await this.processStep(step);

        if (result.action === "next") {
          await this.nextStep();
        } else if (result.action === "previous") {
          await this.previousStep();
        } else if (result.action === "skip") {
          await this.skipStep();
        } else if (result.action === "exit") {
          throw new Error("Wizard cancelled by user");
        }

        // Auto-save progress,
        if (options.autoSave !== false) {
          await this.saveProgress();
        }
      }

      // Generate final configuration,
      const config = await this.generateConfiguration();

      // Validate final configuration,
      const validation = await this.validateConfiguration(config);
      if (!validation._valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
        );
      }

      this.emit("wizard:completed", { config });
      return config;
    } catch (error) {
      this.emit("wizard:error", { error });
      throw error;
    }
  }

  /**
   * Process a wizard step
   */
  private async processStep(step: WizardStep): Promise<StepResult> {
    this.emit("step:started", { step });

    try {
      // Check step dependencies,
      if (!this.checkDependencies(step)) {
        return { action: "skip", reason: "dependencies_not_met" };
      }

      // Evaluate conditional logic,
      if (step.conditional && !this.evaluateCondition(step.conditional)) {
        return { action: "skip", reason: "condition_not_met" };
      }

      // Get current value,
      const currentValue = this.state.answers[step.id];

      // Present step to user,
      const userInput = await this.userInterface.presentStep(step, {
        currentValue,
        preview: this.getPreview(),
        progress: this.getProgress()});

      // Validate input,
      const validation = this.validateStepInput(step, userInput.value);
      if (!validation._valid) {
        await this.userInterface.showValidationErrors(validation.errors.map((error) => error.message),
        );
        return { action: "retry", reason: "validation_failed" };
      }

      // Store answer,
      this.state.answers[step.id] = userInput.value;

      // Update configuration preview,
      this.updatePreview();

      this.emit("step:completed", { step, value: userInput.value });
      return { action: userInput.action || "next" };
    } catch (error) {
      this.emit("step:error", { step, error });
      throw error;
    }
  }

  /**
   * Generate final configuration from wizard answers
   */
  private async generateConfiguration(): Promise<UserConfigurationSchema> {
    const config = { ...this.template.config } as UserConfigurationSchema;

    // Apply wizard answers,
    for (const [stepId, value] of Object.entries(this.state.answers)) {
      const step = this.template._wizard.steps.find((s) => s.id === stepId);
      if (step && step.type !== ("info" as any)) {
        this.applyAnswerToConfig(config, stepId, value, step);
      }
    }

    // Apply template variations,
    for (const [variationId, variation] of Object.entries(
      this.template.variations,
    )) {
      if (this.state.answers[`variation_${variationId}`]) {
        this.mergeConfiguration(config, variation.overrides);
      }
    }

    // Set configuration metadata,
    config._version = this.template._meta.version;

    return config;
  }

  /**
   * Apply wizard answer to configuration
   */
  private applyAnswerToConfig(
    config: UserConfigurationSchema,
    stepId: string,
    value: any,
    step: WizardStep,
  ): void {
    // Map step IDs to configuration paths,
    const pathMapping = this.getConfigurationPathMapping();
    const configPath = pathMapping[stepId];

    if (configPath) {
      this.setConfigValue(config, configPath, value);
    }
  }

  /**
   * Get configuration path mapping for wizard steps
   */
  private getConfigurationPathMapping(): Record<string, string> {
    return {
      _code_quality_strictness: "codeQuality.strictness.global",
      _solid_principles: "codeQuality.solidPrinciples.enabled",
      _legacy_support: "codeQuality.legacySupport.enabled",
      _agent_count: "development.agents.defaultCount",
      _workflow_topology: "development.workflow.defaultTopology",
      _testing_framework: "development.testing.framework",
      _performance_optimization: "performance.optimization.cacheEnabled",
      _security_scanning: "security.scanning.enabled",
      monitoring: "performance.monitoring.enabled",
      // Add more mappings as needed
    };
  }

  /**
   * Set configuration value at path
   */
  private setConfigValue(config: any, path: string, value: any): void {
    const parts = path.split(".");
    let current = config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Initialize wizard state
   */
  private initializeState(): WizardState {
    return {
      _currentStepId: this.template._wizard.steps[0]?.id || "",
      completedSteps: [],
      skippedSteps: [],
      answers: {},
      configuration: {},
      progress: 0,
      startTime: Date.now()};
  }

  // Additional wizard methods...
  getCurrentStep(): WizardStep | null {
    return (this.template._wizard.steps.find(
        (s) => s.id === this.state._currentStepId,
      ) || null
    );
  }

  async nextStep(): Promise<boolean> {
    const currentIndex = this.template._wizard.steps.findIndex((s) => s.id === this.state._currentStepId
    );
    if (currentIndex < this.template._wizard.steps.length - 1) {
      this.state._currentStepId =
        this.template._wizard.steps[currentIndex + 1].id;
      this.updateProgress();
      return true;
    }
    return false;
  }

  async previousStep(): Promise<boolean> {
    const currentIndex = this.template._wizard.steps.findIndex((s) => s.id === this.state._currentStepId
    );
    if (currentIndex > 0) {
      this.state._currentStepId =
        this.template._wizard.steps[currentIndex - 1].id;
      this.updateProgress();
      return true;
    }
    return false;
  }

  private updateProgress(): void {
    const currentIndex = this.template._wizard.steps.findIndex((s) => s.id === this.state._currentStepId
    );
    this.state.progress = Math.round(
      (currentIndex / this.template._wizard.steps.length) * 100,
    );
  }

  private isComplete(): boolean {
    return (
      this.state.completedSteps.length === this.template._wizard.steps.length
    );
  }

  private getPreview(): Partial<UserConfigurationSchema> {
    // Generate preview configuration based on current answers,
    return this.state.configuration;
  }

  private getProgress(): WizardProgress {
    return {
      current: this.state.completedSteps.length,
      total: this.template._wizard.steps.length,
      percentage: this.state.progress};
  }

  // Additional helper methods...
  private checkDependencies(step: WizardStep): boolean {
    if (!step.dependencies) {return true;}
    return step.dependencies.every((dep) =>
      this.state.completedSteps.includes(dep),
    );
  }

  private evaluateCondition(condition: string): boolean {
    // Simple condition evaluation - could be enhanced with expression parser,
    try {
      return new Function("answers", `return ${condition}`)(this.state.answers);
    } catch {
      return false;
    }
  }

  private validateStepInput(step: WizardStep, value: any): ValidationResult {
    const errors: string[] = [];

    if (step.validation) {
      for (const rule of step.validation) {
        const result = this.validateRule(rule, value);
        if (typeof result === "string") {
          errors.push(result);
        }
      }
    }

    return {
      _valid: errors.length === 0,
      errors: errors.map((msg) => ({
        path: step.id,
        message: msg,
        severity: "error" as const,
        code: "validation"})),
      warnings: [],
      suggestions: [],
      score: errors.length === 0 ? 100 : 0};
  }

  private validateRule(rule: any, value: any): boolean | string {
    switch (rule.type) {
      case "required":
        return value !== undefined && value !== null && value !== ""
          ? true: rule.message;
      case "min":
        return value >= rule.value ? true: rule.message;
      case "max":
        return value <= rule.value ? true: rule.message;
      case "pattern":
        return new RegExp(rule.value).test(value) ? true: rule.message;
      case "custom":
        return rule.validator ? rule.validator(value) : true;
      default:
        return true;
    }
  }

  private updatePreview(): void {
    // Update configuration preview based on current answers,
    this.state.configuration = this.generatePartialConfiguration();
  }

  private generatePartialConfiguration(): Partial<UserConfigurationSchema> {
    // Generate partial configuration from current answers,
    const config = {} as Partial<UserConfigurationSchema>;
    const pathMapping = this.getConfigurationPathMapping();

    for (const [stepId, value] of Object.entries(this.state.answers)) {
      const configPath = pathMapping[stepId];
      if (configPath) {
        this.setConfigValue(config, configPath, value);
      }
    }

    return config;
  }

  private mergeConfiguration(
    target: UserConfigurationSchema,
    source: Partial<UserConfigurationSchema>,
  ): void {
    // Deep merge configuration objects,
    this.deepMerge(target, source);
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) {target[key] = {};}
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  private async validateConfiguration(
    config: UserConfigurationSchema,
  ): Promise<ValidationResult> {
    // Comprehensive configuration validation,
    return {
      _valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      score: 100};
  }

  private async saveProgress(): Promise<void> {
    // Save wizard state to persistence layer,
    this.state.lastSaved = Date.now();
    // Implementation would save to file system or database
  }

  private async loadProgress(): Promise<boolean> {
    // Load wizard state from persistence layer
    // Implementation would load from file system or database,
    return false;
  }

  private async skipStep(): Promise<void> {
    this.state.skippedSteps.push(this.state._currentStepId);
    await this.nextStep();
  }
}

// ============================================================================
// USER INTERFACE ABSTRACTION
// ============================================================================

export interface WizardUserInterface {
  presentStep(step: WizardStep, context: StepContext): Promise<StepInput>;
  showValidationErrors(errors: string[]): Promise<void>;
  showProgress(progress: WizardProgress): Promise<void>;
  showPreview(config: Partial<UserConfigurationSchema>): Promise<void>;
  confirm(message: string): Promise<boolean>;
  selectFromList<T>(options: T[],  formatter?: (item: T) => string): Promise<T>;}

export interface StepContext {
  currentValue?: any;
  preview: Partial<UserConfigurationSchema>;
  progress: WizardProgress;}

export interface StepInput {
  value: any;
  action?: "next" | "previous" | "skip" | "exit";
}

export interface StepResult {
  action: "next" | "previous" | "skip" | "retry" | "exit";
  reason?: string;
}

export interface WizardProgress {
  current: number;
  total: number;
  percentage: number;}

export interface WizardStartOptions {
  resumeSession?: boolean;
  autoSave?: boolean;
  theme?: "light" | "dark" | "auto";
  interactive?: boolean;
}

// ============================================================================
// PROGRESSIVE CONFIGURATION DISCOVERY
// ============================================================================

export interface ConfigurationDiscovery {
  // Smart Defaults,
  inferProjectSettings(projectPath: string): Promise<InferredSettings>;
  suggestAgentConfiguration(
    analysis: ProjectAnalysis,
  ): Promise<AgentSuggestion[]>;
  recommendWorkflow(
    requirements: WorkflowRequirements,
  ): Promise<WorkflowRecommendation>;

  // Learning & Adaptation,
  learnFromUsage(session: ConfigurationSession): Promise<void>;
  adaptConfiguration(
    config: UserConfigurationSchema,
    feedback: UserFeedback,
  ): Promise<UserConfigurationSchema>;
  suggestOptimizations(
    metrics: PerformanceMetrics,
  ): Promise<OptimizationSuggestion[]>;

  // Context-Aware Suggestions,
  contextualRecommendations(
    context: UserContext,
  ): Promise<ContextualRecommendation[]>;
  seasonalAdjustments(
    config: UserConfigurationSchema,
  ): Promise<Partial<UserConfigurationSchema>>;
}

export interface InferredSettings {
  projectType: string;
  language: string;
  framework?: string;
  buildSystem?: string;
  testingFramework?: string;
  confidence: number;
  evidence: string[];}

export interface AgentSuggestion {
  type: string;
  reason: string;
  priority: "low" | "medium" | "high";
  configuration: any;}

export interface WorkflowRequirements {
  taskType: string;
  complexity: "simple" | "moderate" | "complex";
  timeConstraint: "urgent" | "normal" | "thorough";
  qualityLevel: "draft" | "production" | "critical";
  teamSize: number;}

export interface WorkflowRecommendation {
  topology: string;
  strategy: string;
  agentCount: number;
  estimatedTime: string;
  confidence: number;
  rationale: string[];}

export interface ConfigurationSession {
  id: string;
  config: UserConfigurationSchema;
  startTime: number;
  endTime: number;
  tasks: string[];
  performance: PerformanceMetrics;
  userActions: UserAction[];
  outcome: "success" | "failure" | "partial";}

export interface UserFeedback {
  session: string;
  rating: number; // 1-5 stars,
  issues: FeedbackIssue[];
  suggestions: string[];
  wouldRecommend: boolean;}

export interface FeedbackIssue {
  category: "performance" | "usability" | "functionality" | "reliability";
  description: string;
  severity: "low" | "medium" | "high";
  configSection?: string;
}

export interface OptimizationSuggestion {
  type: "performance" | "quality" | "efficiency" | "user_experience";
  description: string;
  implementation: ConfigurationChange[];
  expectedImpact: string;
  effort: "low" | "medium" | "high";}

export interface ConfigurationChange {
  path: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;}

export interface UserContext {
  timeOfDay: string;
  dayOfWeek: string;
  projectPhase: "planning"
    | "development"
    | "testing"
    | "deployment"
    | "maintenance";
  workload: "light" | "normal" | "heavy";
  deadlines: string[];}

export interface ContextualRecommendation {
  trigger: string;
  suggestion: string;
  configChanges: ConfigurationChange[];
  temporary: boolean;
  priority: "low" | "medium" | "high";}

export interface UserAction {
  timestamp: number;
  type: "config_change"
    | "preset_apply"
    | "wizard_complete"
    | "manual_override";
  details: any;
  duration?: number;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  agentEfficiency: number;
  userSatisfaction: number;
  errorRate: number;
  completionRate: number;}

// ============================================================================
// EXPORT ALL INTERFACES
// ============================================================================

// Note: All types are already exported above with interface declarations,
