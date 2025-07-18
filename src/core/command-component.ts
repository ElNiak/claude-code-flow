import { UnifiedInfrastructure } from './unified-infrastructure.js';
import { EventBus } from './event-bus.js';
import { Logger } from './logger.js';

/**
 * Base interface for all command components
 */
export interface ICommandComponent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly dependencies: string[];

  // Core execution method
  execute(context: ExecutionContext, options: ComponentOptions): Promise<ComponentResult>;

  // Validation and metadata
  validate(options: ComponentOptions): ValidationResult;
  getDependencies(): string[];
  getMetadata(): ComponentMetadata;
}

/**
 * Execution context for command components
 */
export interface ExecutionContext {
  readonly sessionId: string;
  readonly workflowId: string;
  readonly logger: Logger;
  readonly eventBus: EventBus;
  readonly sharedState: Map<string, any>;
  readonly config: any;
  readonly startTime: number;
  readonly workingDirectory: string;
  readonly environment: Record<string, string>;
}

/**
 * Options passed to command components
 */
export interface ComponentOptions {
  [key: string]: any;
}

/**
 * Result returned by command components
 */
export interface ComponentResult {
  success: boolean;
  data?: any;
  error?: Error;
  warnings?: string[];
  nextActions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Validation result for component options
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Component metadata
 */
export interface ComponentMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  dependencies: string[];
  optionalDependencies: string[];
  requiredOptions: string[];
  optionalOptions: string[];
}

/**
 * Abstract base class for all command components
 */
export abstract class BaseCommandComponent implements ICommandComponent {
  protected readonly infrastructure: UnifiedInfrastructure;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: string,
    public readonly dependencies: string[] = []
  ) {
    this.infrastructure = UnifiedInfrastructure.getInstance();
  }

  /**
   * Execute the component with standard error handling and logging
   */
  async execute(context: ExecutionContext, options: ComponentOptions): Promise<ComponentResult> {
    const startTime = Date.now();

    try {
      // Validate options
      const validation = this.validate(options);
      if (!validation.valid) {
        return {
          success: false,
          error: new Error(`Validation failed: ${validation.errors.join(', ')}`),
          warnings: validation.warnings
        };
      }

      // Log execution start
      context.logger.info(
        this.infrastructure.outputFormatter.progress(
          `Executing ${this.name}...`
        )
      );

      // Pre-execution hooks
      await this.preExecute(context, options);

      // Execute core logic
      const result = await this.executeCore(context, options);

      // Post-execution hooks
      await this.postExecute(context, options, result);

      // Log execution completion
      const duration = Date.now() - startTime;
      context.logger.info(
        this.infrastructure.outputFormatter.success(
          `${this.name} completed in ${duration}ms`
        )
      );

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      context.logger.error(
        this.infrastructure.outputFormatter.error(
          `${this.name} failed after ${duration}ms: ${(error as Error).message}`
        )
      );

      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Abstract method for core execution logic
   */
  protected abstract executeCore(
    context: ExecutionContext,
    options: ComponentOptions
  ): Promise<ComponentResult>;

  /**
   * Validate component options
   */
  abstract validate(options: ComponentOptions): ValidationResult;

  /**
   * Pre-execution hook
   */
  protected async preExecute(
    context: ExecutionContext,
    options: ComponentOptions
  ): Promise<void> {
    // Emit pre-execution event
    context.eventBus.emit('component:pre-execute', {
      componentId: this.id,
      options
    });
  }

  /**
   * Post-execution hook
   */
  protected async postExecute(
    context: ExecutionContext,
    options: ComponentOptions,
    result: ComponentResult
  ): Promise<void> {
    // Emit post-execution event
    context.eventBus.emit('component:post-execute', {
      componentId: this.id,
      options,
      result
    });
  }

  /**
   * Get component dependencies
   */
  getDependencies(): string[] {
    return [...this.dependencies];
  }

  /**
   * Get component metadata
   */
  abstract getMetadata(): ComponentMetadata;

  /**
   * Helper method to create validation result
   */
  protected createValidationResult(
    valid: boolean,
    errors: string[] = [],
    warnings: string[] = []
  ): ValidationResult {
    return { valid, errors, warnings };
  }

  /**
   * Helper method to create success result
   */
  protected createSuccessResult(data?: any, nextActions?: string[]): ComponentResult {
    return {
      success: true,
      data,
      nextActions
    };
  }

  /**
   * Helper method to create error result
   */
  protected createErrorResult(error: Error, warnings?: string[]): ComponentResult {
    return {
      success: false,
      error,
      warnings
    };
  }
}

/**
 * Command component registry
 */
export class CommandComponentRegistry {
  private static instance: CommandComponentRegistry;
  private components = new Map<string, ICommandComponent>();
  private infrastructure: UnifiedInfrastructure;

  private constructor() {
    this.infrastructure = UnifiedInfrastructure.getInstance();
  }

  public static getInstance(): CommandComponentRegistry {
    if (!CommandComponentRegistry.instance) {
      CommandComponentRegistry.instance = new CommandComponentRegistry();
    }
    return CommandComponentRegistry.instance;
  }

  /**
   * Register a command component
   */
  register(component: ICommandComponent): void {
    if (this.components.has(component.id)) {
      throw new Error(`Component ${component.id} is already registered`);
    }

    this.components.set(component.id, component);
    this.infrastructure.logger.info(
      this.infrastructure.outputFormatter.info(
        `Registered component: ${component.name}`
      )
    );
  }

  /**
   * Get a command component
   */
  get(id: string): ICommandComponent | undefined {
    return this.components.get(id);
  }

  /**
   * Get all registered components
   */
  getAll(): ICommandComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by category
   */
  getByCategory(category: string): ICommandComponent[] {
    return Array.from(this.components.values())
      .filter(component => component.category === category);
  }

  /**
   * Check if component is registered
   */
  has(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Execute a component
   */
  async execute(
    componentId: string,
    context: ExecutionContext,
    options: ComponentOptions
  ): Promise<ComponentResult> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Check dependencies
    await this.checkDependencies(component, context);

    // Execute component
    return await component.execute(context, options);
  }

  /**
   * Check component dependencies
   */
  private async checkDependencies(
    component: ICommandComponent,
    context: ExecutionContext
  ): Promise<void> {
    for (const depId of component.getDependencies()) {
      if (!this.components.has(depId)) {
        throw new Error(
          `Component ${component.id} depends on ${depId} which is not registered`
        );
      }
    }
  }

  /**
   * Get component execution order based on dependencies
   */
  getExecutionOrder(componentIds: string[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving ${id}`);
      }

      visiting.add(id);

      const component = this.components.get(id);
      if (component) {
        for (const depId of component.getDependencies()) {
          if (componentIds.includes(depId)) {
            visit(depId);
          }
        }
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of componentIds) {
      visit(id);
    }

    return order;
  }
}
