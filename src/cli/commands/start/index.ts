// start.js - Re-export the wrapper to maintain backward compatibility

export type {
	Deployment,
	DeploymentEnvironment,
	DeploymentMetrics,
	DeploymentPipeline,
	DeploymentStage,
	DeploymentStrategy,
} from "./deployment/deployment-manager.js";

// Enterprise deployment management features
export { DeploymentManager } from "./deployment/deployment-manager.js";
export { startCommand } from "./start-wrapper.js";
