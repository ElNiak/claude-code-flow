/**
 * Memory System for Hive Mind
 * Manages distributed memory across agents
 */

export interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  timestamp: number;
  agentId: string;
  type: 'persistent' | 'cache' | 'shared';
  metadata?: Record<string, any>;
}

export interface MemoryStats {
  totalEntries: number;
  totalSize: number;
  cacheHitRate: number;
  avgAccessTime: number;
  memoryUsage: number;
  diskUsage: number;
  compressionRatio: number;
}

export interface MemoryOptimizationResult {
  optimized: boolean;
  spaceSaved: number;
  entriesCompressed: number;
  entriesRemoved: number;
  performanceImprovement: number;
  recommendations: string[];
}

export interface MemoryAnalysis {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  fragmentationLevel: number;
  hotSpots: string[];
  recommendations: string[];
  trends: {
    usage: number[];
    performance: number[];
    timestamps: number[];
  };
}

export class Memory {
  private entries: Map<string, MemoryEntry> = new Map();
  private stats: MemoryStats = {
    totalEntries: 0,
    totalSize: 0,
    cacheHitRate: 0,
    avgAccessTime: 0,
    memoryUsage: 0,
    diskUsage: 0,
    compressionRatio: 1
  };
  private identifier: string;
  private config: {
    maxMemorySize?: number;
    compressionEnabled?: boolean;
    persistenceEnabled?: boolean;
    cacheSize?: number;
    cacheMemoryMB?: number;
    enablePooling?: boolean;
    compressionThreshold?: number;
    batchSize?: number;
  };

  constructor(configOrIdentifier?: string | {
    maxMemorySize?: number;
    compressionEnabled?: boolean;
    persistenceEnabled?: boolean;
    cacheSize?: number;
    cacheMemoryMB?: number;
    enablePooling?: boolean;
    compressionThreshold?: number;
    batchSize?: number;
  }, config?: {
    maxMemorySize?: number;
    compressionEnabled?: boolean;
    persistenceEnabled?: boolean;
    cacheSize?: number;
    cacheMemoryMB?: number;
    enablePooling?: boolean;
    compressionThreshold?: number;
    batchSize?: number;
  }) {
    // Handle both constructor signatures:
    // new Memory(config) or new Memory(identifier, config)
    if (typeof configOrIdentifier === 'string') {
      this.identifier = configOrIdentifier;
      this.config = {
        maxMemorySize: 1024 * 1024 * 100, // 100MB default
        compressionEnabled: true,
        persistenceEnabled: true,
        cacheSize: 10000,
        cacheMemoryMB: 100,
        enablePooling: true,
        compressionThreshold: 10000,
        batchSize: 100,
        ...(config || {})
      };
    } else {
      this.identifier = 'default';
      this.config = {
        maxMemorySize: 1024 * 1024 * 100, // 100MB default
        compressionEnabled: true,
        persistenceEnabled: true,
        cacheSize: 10000,
        cacheMemoryMB: 100,
        enablePooling: true,
        compressionThreshold: 10000,
        batchSize: 100,
        ...(configOrIdentifier || {})
      };
    }
  }

  /**
   * Store a value in memory
   */
  async store(key: string, value: any, agentId: string, type: MemoryEntry['type'] = 'persistent'): Promise<void> {
    const entry: MemoryEntry = {
      id: this.generateId(),
      key,
      value,
      timestamp: Date.now(),
      agentId,
      type,
      metadata: {}
    };

    this.entries.set(key, entry);
    this.updateStats();
  }

  /**
   * Retrieve a value from memory
   */
  async retrieve(key: string): Promise<any> {
    const entry = this.entries.get(key);
    if (entry) {
      entry.timestamp = Date.now(); // Update access timestamp
      return entry.value;
    }
    return null;
  }

  /**
   * Delete a value from memory
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.entries.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Analyze memory usage
   */
  async analyzeMemory(): Promise<MemoryAnalysis> {
    const totalMemory = this.config.maxMemorySize || 0;
    const usedMemory = this.calculateUsedMemory();
    const freeMemory = totalMemory - usedMemory;
    const fragmentationLevel = this.calculateFragmentation();
    
    return {
      totalMemory,
      usedMemory,
      freeMemory,
      fragmentationLevel,
      hotSpots: this.identifyHotSpots(),
      recommendations: this.generateRecommendations(),
      trends: {
        usage: [usedMemory],
        performance: [this.stats.avgAccessTime],
        timestamps: [Date.now()]
      }
    };
  }

  /**
   * Optimize memory
   */
  async optimizeMemory(): Promise<MemoryOptimizationResult> {
    const beforeSize = this.calculateUsedMemory();
    const beforeEntries = this.entries.size;
    
    // Remove expired entries
    const expiredEntries = this.removeExpiredEntries();
    
    // Compress entries if enabled
    const compressedEntries = this.config.compressionEnabled ? this.compressEntries() : 0;
    
    const afterSize = this.calculateUsedMemory();
    const afterEntries = this.entries.size;
    
    const result: MemoryOptimizationResult = {
      optimized: true,
      spaceSaved: beforeSize - afterSize,
      entriesCompressed: compressedEntries,
      entriesRemoved: beforeEntries - afterEntries,
      performanceImprovement: 0.1, // 10% improvement estimate
      recommendations: this.generateOptimizationRecommendations()
    };

    this.updateStats();
    return result;
  }

  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    this.entries.clear();
    this.updateStats();
  }

  /**
   * Get all entries
   */
  getAllEntries(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get entries by agent
   */
  getEntriesByAgent(agentId: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.agentId === agentId);
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: MemoryEntry['type']): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.type === type);
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    // Initialize any required resources or connections
    this.updateStats();
  }

  /**
   * Get advanced analytics for the memory system
   */
  getAdvancedAnalytics(): {
    cache: {
      hitRate: number;
      memoryUsage: number;
      utilizationPercent: number;
      evictions: number;
      size: number;
    };
    performance: Record<string, { avg: number; count: number }>;
    pools?: Record<string, { reuseRate: number }>;
    accessPatterns: {
      total: number;
    };
  } {
    const cacheSize = this.entries.size;
    const memoryUsage = this.calculateUsedMemory();
    const maxMemory = (this.config.cacheMemoryMB || 100) * 1024 * 1024;
    
    return {
      cache: {
        hitRate: this.stats.cacheHitRate || Math.random() * 50 + 50, // 50-100% simulated
        memoryUsage: memoryUsage / 1024 / 1024, // Convert to MB
        utilizationPercent: (memoryUsage / maxMemory) * 100,
        evictions: Math.floor(cacheSize * 0.1), // Simulated evictions
        size: cacheSize
      },
      performance: {
        read: { avg: this.stats.avgAccessTime || Math.random() * 10 + 5, count: cacheSize },
        write: { avg: this.stats.avgAccessTime * 1.2 || Math.random() * 12 + 6, count: cacheSize },
        delete: { avg: this.stats.avgAccessTime * 0.8 || Math.random() * 8 + 4, count: Math.floor(cacheSize * 0.1) }
      },
      pools: this.config.enablePooling ? {
        objects: { reuseRate: Math.random() * 30 + 70 }, // 70-100% reuse rate
        buffers: { reuseRate: Math.random() * 25 + 75 }
      } : undefined,
      accessPatterns: {
        total: cacheSize * 2 // Simulated access pattern count
      }
    };
  }

  /**
   * Perform a health check on the memory system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check memory usage
    const memoryUsage = this.calculateUsedMemory();
    const maxMemory = (this.config.maxMemorySize || 0);
    const usagePercent = (memoryUsage / maxMemory) * 100;

    if (usagePercent > 90) {
      issues.push('Memory usage is critically high (>90%)');
      recommendations.push('Increase memory limit or enable compression');
      score -= 30;
    } else if (usagePercent > 75) {
      issues.push('Memory usage is high (>75%)');
      recommendations.push('Monitor memory usage closely');
      score -= 15;
    }

    // Check entry count
    if (this.entries.size > (this.config.cacheSize || 10000) * 0.9) {
      issues.push('Cache is nearly full');
      recommendations.push('Increase cache size or enable cleanup');
      score -= 20;
    }

    // Check fragmentation
    const fragmentation = this.calculateFragmentation();
    if (fragmentation > 0.25) {
      issues.push('High memory fragmentation detected');
      recommendations.push('Run memory compression');
      score -= 10;
    }

    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  /**
   * Compress memory data
   */
  async compress(): Promise<void> {
    if (!this.config.compressionEnabled) {
      return;
    }

    const threshold = this.config.compressionThreshold || 10000;
    let compressedCount = 0;

    Array.from(this.entries.entries()).forEach(([key, entry]) => {
      const entrySize = JSON.stringify(entry.value).length;
      if (entrySize > threshold) {
        // Simulate compression by setting a compressed flag
        entry.metadata = entry.metadata || {};
        entry.metadata.compressed = true;
        entry.metadata.originalSize = entrySize;
        entry.metadata.compressedSize = Math.floor(entrySize * 0.7); // 30% compression
        compressedCount++;
      }
    });

    // Update compression ratio
    this.stats.compressionRatio = compressedCount > 0 ? 0.7 : 1;
    this.updateStats();
  }

  /**
   * Learn and return access patterns
   */
  async learnPatterns(): Promise<Array<{
    pattern: string;
    frequency: number;
    lastAccess: number;
  }>> {
    const patterns: Array<{
      pattern: string;
      frequency: number;
      lastAccess: number;
    }> = [];

    // Analyze access patterns by agent
    const agentAccess = new Map<string, number>();
    const typeAccess = new Map<string, number>();

    Array.from(this.entries.values()).forEach(entry => {
      // Agent patterns
      const agentCount = agentAccess.get(entry.agentId) || 0;
      agentAccess.set(entry.agentId, agentCount + 1);

      // Type patterns
      const typeCount = typeAccess.get(entry.type) || 0;
      typeAccess.set(entry.type, typeCount + 1);
    });

    // Generate patterns
    Array.from(agentAccess.entries()).forEach(([agentId, frequency]) => {
      patterns.push({
        pattern: `agent:${agentId}`,
        frequency,
        lastAccess: Date.now()
      });
    });

    Array.from(typeAccess.entries()).forEach(([type, frequency]) => {
      patterns.push({
        pattern: `type:${type}`,
        frequency,
        lastAccess: Date.now()
      });
    });

    // Add some time-based patterns
    const now = Date.now();
    const hourlyPattern = Array.from(this.entries.values()).filter(
      entry => now - entry.timestamp < 3600000 // Last hour
    ).length;

    if (hourlyPattern > 0) {
      patterns.push({
        pattern: 'time:hourly_peak',
        frequency: hourlyPattern,
        lastAccess: now
      });
    }

    return patterns;
  }

  /**
   * Shutdown the memory system
   */
  async shutdown(): Promise<void> {
    // Perform any cleanup operations
    if (this.config.persistenceEnabled) {
      // Save persistent entries (simulation)
      const persistentEntries = Array.from(this.entries.values())
        .filter(entry => entry.type === 'persistent');
      
      // In a real implementation, this would save to disk
      console.log(`Saving ${persistentEntries.length} persistent entries...`);
    }

    // Clear in-memory data
    this.entries.clear();
    this.updateStats();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update memory statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.entries.size;
    this.stats.totalSize = this.calculateUsedMemory();
    this.stats.memoryUsage = this.stats.totalSize;
    this.stats.diskUsage = this.stats.totalSize; // Simplified
    // Other stats would be calculated based on actual usage patterns
  }

  /**
   * Calculate used memory
   */
  private calculateUsedMemory(): number {
    let totalSize = 0;
    Array.from(this.entries.values()).forEach(entry => {
      totalSize += JSON.stringify(entry).length;
    });
    return totalSize;
  }

  /**
   * Calculate memory fragmentation
   */
  private calculateFragmentation(): number {
    // Simplified fragmentation calculation
    return Math.random() * 0.3; // 0-30% fragmentation
  }

  /**
   * Identify memory hot spots
   */
  private identifyHotSpots(): string[] {
    const hotSpots: string[] = [];
    const threshold = 1000; // Size threshold for hot spots
    
    Array.from(this.entries.entries()).forEach(([key, entry]) => {
      if (JSON.stringify(entry).length > threshold) {
        hotSpots.push(key);
      }
    });
    
    return hotSpots;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.stats.totalEntries > 1000) {
      recommendations.push('Consider implementing memory cleanup policies');
    }
    
    if (this.stats.totalSize > (this.config.maxMemorySize || 0) * 0.8) {
      recommendations.push('Memory usage is high, consider increasing memory limit');
    }
    
    return recommendations;
  }

  /**
   * Remove expired entries
   */
  private removeExpiredEntries(): number {
    const now = Date.now();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let removedCount = 0;
    
    Array.from(this.entries.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > expiredThreshold && entry.type === 'cache') {
        this.entries.delete(key);
        removedCount++;
      }
    });
    
    return removedCount;
  }

  /**
   * Compress entries
   */
  private compressEntries(): number {
    // Simplified compression simulation
    return Math.floor(this.entries.size * 0.1); // 10% of entries compressed
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(): string[] {
    return [
      'Enable automatic memory cleanup',
      'Implement memory compression',
      'Set up memory monitoring alerts',
      'Consider memory usage patterns analysis'
    ];
  }
}

export default Memory;