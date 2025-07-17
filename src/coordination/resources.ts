import { getErrorMessage as _getErrorMessage } from "../utils/error-handler.js";

/**
 * Resource manager for preventing conflicts and deadlocks
 */

import type { IEventBus } from "../core/event-bus.js";
import type { ILogger } from "../core/logger.js";
import { ResourceLockError } from "../utils/errors.js";
import { delay, timeout } from "../utils/helpers.js";
import {
	type CoordinationConfig,
	type Resource,
	SystemEvents,
} from "../utils/types.js";

interface LockRequest {
	agentId: string;
	resourceId: string;
	timestamp: Date;
	priority: number;
}

/**
 * Resource manager implementation
 */
export class ResourceManager {
	private resources = new Map<string, Resource>();
	private locks = new Map<string, string>(); // resourceId -> agentId,
	private waitQueue = new Map<string, LockRequest[]>(); // resourceId -> queue,
	private agentResources = new Map<string, Set<string>>(); // agentId -> resourceIds,

	constructor(
		private config: CoordinationConfig,
		private eventBus: IEventBus,
		private logger: ILogger
	) {}

	async initialize(): Promise<void> {
		this.logger.info("Initializing resource manager");

		// Set up periodic cleanup,
		setInterval(() => this.cleanup(), 30000); // Every 30 seconds
	}

	async shutdown(): Promise<void> {
		this.logger.info("Shutting down resource manager");

		// Release all locks,
		for (const [resourceId, agentId] of this.locks) {
			await this.release(resourceId, agentId);
		}

		this.resources.clear();
		this.locks.clear();
		this.waitQueue.clear();
		this.agentResources.clear();
	}

	async acquire(
		resourceId: string,
		agentId: string,
		priority = 0
	): Promise<void> {
		this.logger.info("🔍 DEADLOCK DEBUG: Resource acquisition requested", {
			resourceId,
			agentId,
			priority,
		});

		// Check if resource exists,
		if (!this.resources.has(resourceId)) {
			this.logger.info("🔍 DEADLOCK DEBUG: Creating new resource", {
				resourceId,
			});
			this.resources.set(resourceId, {
				id: resourceId,
				type: "generic",
				locked: false,
			});
		}

		const resource = this.resources.get(resourceId)!;

		// Check if already locked by this agent,
		if (this.locks.get(resourceId) === agentId) {
			this.logger.info("🔍 DEADLOCK DEBUG: Resource already locked by agent", {
				resourceId,
				agentId,
			});
			return;
		}

		// Try to acquire lock,
		if (!resource.locked) {
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Resource available, acquiring lock",
				{ resourceId, agentId }
			);
			await this.lockResource(resourceId, agentId);
			return;
		}

		// Add to wait queue,
		const request: LockRequest = {
			agentId,
			resourceId,
			timestamp: new Date(),
			priority,
		};

		if (!this.waitQueue.has(resourceId)) {
			this.waitQueue.set(resourceId, []);
		}

		const queue = this.waitQueue.get(resourceId)!;
		queue.push(request);

		// Sort by priority and timestamp,
		queue.sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority; // Higher priority first
			}
			return a.timestamp.getTime() - b.timestamp.getTime(); // Earlier first
		});

		this.logger.info("Agent added to resource wait queue", {
			resourceId,
			agentId,
			queueLength: queue.length,
		});

		// Wait for resource with timeout,
		this.logger.info("🔍 DEADLOCK DEBUG: Starting resource wait cycle", {
			resourceId,
			agentId,
			timeout: this.config.resourceTimeout,
		});
		const startTime = Date.now();
		let waitCycles = 0;
		while (Date.now() - startTime < this.config.resourceTimeout) {
			waitCycles++;
			// Check if we're next in queue and resource is available,
			const nextRequest = queue[0];
			if (nextRequest?.agentId === agentId && !resource.locked) {
				this.logger.info(
					"🔍 DEADLOCK DEBUG: Resource now available, acquiring",
					{ resourceId, agentId, waitCycles }
				);
				// Remove from queue and acquire,
				queue.shift();
				await this.lockResource(resourceId, agentId);
				return;
			}

			// Check if our request is still in queue,
			const ourRequest = queue.find((req) => req.agentId === agentId);
			if (!ourRequest) {
				this.logger.warn("🚨 DEADLOCK DEBUG: Resource request was cancelled", {
					resourceId,
					agentId,
					waitCycles,
				});
				// Request was removed (possibly by cleanup)
				throw new ResourceLockError("Resource request cancelled");
			}

			if (waitCycles % 50 === 0) {
				// Log every 5 seconds
				this.logger.info("🔍 DEADLOCK DEBUG: Still waiting for resource", {
					resourceId,
					agentId,
					waitCycles,
					queuePosition: queue.findIndex((req) => req.agentId === agentId) + 1,
					queueLength: queue.length,
					currentOwner: this.locks.get(resourceId),
				});
			}

			await delay(100);
		}

		// Timeout - remove from queue,
		const index = queue.findIndex((req) => req.agentId === agentId);
		if (index !== -1) {
			queue.splice(index, 1);
		}

		throw new ResourceLockError(
			`Resource acquisition timeout for ${resourceId}`,
			{ resourceId, agentId, timeout: this.config.resourceTimeout }
		);
	}

	async release(resourceId: string, agentId: string): Promise<void> {
		this.logger.info("🔍 DEADLOCK DEBUG: Resource release requested", {
			resourceId,
			agentId,
		});

		const currentLock = this.locks.get(resourceId);
		if (currentLock !== agentId) {
			this.logger.warn(
				"🚨 DEADLOCK DEBUG: Attempted to release unowned resource",
				{
					resourceId,
					agentId,
					currentLock,
				}
			);
			return;
		}

		// Release the lock,
		this.logger.info("🔍 DEADLOCK DEBUG: Releasing resource lock", {
			resourceId,
			agentId,
		});
		this.unlockResource(resourceId, agentId);

		// Process wait queue,
		const queue = this.waitQueue.get(resourceId);
		if (queue && queue.length > 0) {
			const nextRequest = queue.shift()!;
			this.logger.info(
				"🔍 DEADLOCK DEBUG: Granting resource to next in queue",
				{
					resourceId,
					nextAgentId: nextRequest.agentId,
					queueLength: queue.length,
				}
			);

			// Grant lock to next in queue,
			await this.lockResource(resourceId, nextRequest.agentId);
		} else {
			this.logger.info("🔍 DEADLOCK DEBUG: No agents waiting for resource", {
				resourceId,
			});
		}
	}

	async releaseAllForAgent(agentId: string): Promise<void> {
		this.logger.info("🔍 DEADLOCK DEBUG: Releasing all resources for agent", {
			agentId,
		});
		const resources = this.agentResources.get(agentId);
		if (!resources) {
			this.logger.info("🔍 DEADLOCK DEBUG: No resources found for agent", {
				agentId,
			});
			return;
		}

		const resourceIds = Array.from(resources);
		this.logger.info("🔍 DEADLOCK DEBUG: Starting bulk resource release", {
			agentId,
			resourceCount: resourceIds.length,
			resourceIds,
		});

		const promises = resourceIds.map((resourceId) =>
			this.release(resourceId, agentId)
		);

		const releaseStart = Date.now();
		await Promise.all(promises);
		const releaseDuration = Date.now() - releaseStart;

		this.agentResources.delete(agentId);
		this.logger.info("🔍 DEADLOCK DEBUG: Bulk resource release completed", {
			agentId,
			resourceCount: resourceIds.length,
			duration: releaseDuration,
		});
	}

	getAllocations(): Map<string, string> {
		return new Map(this.locks);
	}

	getWaitingRequests(): Map<string, string[]> {
		const waiting = new Map<string, string[]>();

		for (const [resourceId, queue] of this.waitQueue) {
			if (queue.length > 0) {
				waiting.set(queue[0].agentId, [
					...(waiting.get(queue[0].agentId) || []),
					resourceId,
				]);
			}
		}

		return waiting;
	}

	async getHealthStatus(): Promise<{
		healthy: boolean;
		error?: string;
		metrics?: Record<string, number>;
	}> {
		const totalResources = this.resources.size;
		const lockedResources = this.locks.size;
		const waitingAgents = new Set<string>();
		let totalWaiting = 0;

		for (const queue of this.waitQueue.values()) {
			totalWaiting += queue.length;
			queue.forEach((req) => waitingAgents.add(req.agentId));
		}

		return {
			healthy: true,
			metrics: {
				totalResources,
				lockedResources,
				freeResources: totalResources - lockedResources,
				waitingAgents: waitingAgents.size,
				totalWaitingRequests: totalWaiting,
			},
		};
	}

	private async lockResource(
		resourceId: string,
		agentId: string
	): Promise<void> {
		const resource = this.resources.get(resourceId)!;

		resource.locked = true;
		resource.lockedBy = agentId;
		resource.lockedAt = new Date();

		this.locks.set(resourceId, agentId);

		// Track agent resources,
		if (!this.agentResources.has(agentId)) {
			this.agentResources.set(agentId, new Set());
		}
		this.agentResources.get(agentId)!.add(resourceId);

		this.logger.info("Resource locked", { resourceId, agentId });

		// Emit event,
		this.eventBus.emit(SystemEvents.RESOURCE_ACQUIRED, { resourceId, agentId });
	}

	private unlockResource(resourceId: string, agentId: string): void {
		const resource = this.resources.get(resourceId);
		if (!resource) {
			return;
		}

		resource.locked = false;
		delete resource.lockedBy;
		delete resource.lockedAt;

		this.locks.delete(resourceId);

		// Remove from agent resources,
		this.agentResources.get(agentId)?.delete(resourceId);

		this.logger.info("Resource unlocked", { resourceId, agentId });

		// Emit event,
		this.eventBus.emit(SystemEvents.RESOURCE_RELEASED, { resourceId, agentId });
	}

	async performMaintenance(): Promise<void> {
		this.logger.debug("Performing resource manager maintenance");
		this.cleanup();
	}

	private cleanup(): void {
		const now = Date.now();

		// Clean up stale wait requests,
		for (const [resourceId, queue] of this.waitQueue) {
			const filtered = queue.filter((req) => {
				const age = now - req.timestamp.getTime();
				if (age > this.config.resourceTimeout) {
					this.logger.warn("Removing stale resource request", {
						resourceId,
						agentId: req.agentId,
						age,
					});
					return false;
				}
				return true;
			});

			if (filtered.length === 0) {
				this.waitQueue.delete(resourceId);
			} else {
				this.waitQueue.set(resourceId, filtered);
			}
		}

		// Clean up locks held too long,
		for (const [resourceId, agentId] of this.locks) {
			const resource = this.resources.get(resourceId);
			if (resource?.lockedAt) {
				const lockAge = now - resource.lockedAt.getTime();
				if (lockAge > this.config.resourceTimeout * 2) {
					this.logger.warn("Force releasing stale lock", {
						resourceId,
						agentId,
						lockAge,
					});
					this.unlockResource(resourceId, agentId);
				}
			}
		}
	}
}
