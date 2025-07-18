/**
 * Serena MCP Multi-Tiered Caching System
 *
 * This module implements the intelligent multi-tiered caching system
 * for Serena MCP performance optimization.
 */

import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { watch } from 'node:fs';
import type {
  SymbolInfo,
  ASTNode,
  TypeInfo,
  Definition,
  Reference,
  Dependency,
  CacheEntry,
  CacheMetrics,
  InvalidationTask,
  DependencyGraph,
  SerenaOptimizationEventEmitter,
  SerenaOptimizationConfig
} from './serena-optimization-interfaces.js';

export class SerenaMultiTierCache extends EventEmitter implements SerenaOptimizationEventEmitter {
  private l1Cache: Map<string, CacheEntry<any>>;
  private l2Cache: Map<string, CacheEntry<any>>;
  private l3Cache: Map<string, CacheEntry<any>>;
  private dependencyGraph: SerenaDependencyGraph;
  private fileWatcher: FileSystemWatcher;
  private invalidationQueue: InvalidationTask[];
  private cacheMetrics: CacheMetrics;
  private config: SerenaOptimizationConfig['cache'];
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(config: SerenaOptimizationConfig['cache']) {
    super();
    this.config = config;
    this.l1Cache = new Map();
    this.l2Cache = new Map();
    this.l3Cache = new Map();
    this.dependencyGraph = new SerenaDependencyGraph();
    this.fileWatcher = new FileSystemWatcher();
    this.invalidationQueue = [];
    this.cacheMetrics = this.initializeMetrics();

    this.initialize();
  }

  private initialize(): void {
    // Set up file watcher for cache invalidation
    this.fileWatcher.on('file-changed', (filePath: string) => {
      this.handleFileChange(filePath);
    });

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance();
    }, 60000); // Every minute

    // Set up metrics collection
    this.startMetricsCollection();
  }

  // ===== PUBLIC API =====

  /**
   * Get symbol information from cache
   */
  async getSymbol(symbolName: string, projectPath: string): Promise<SymbolInfo | null> {
    const key = `symbol:${symbolName}:${projectPath}`;

    // Try L1 cache first
    let entry = this.l1Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.emit('cache:hit', key, 'L1');
      this.cacheMetrics.l1Metrics.hitRate++;
      return entry.value;
    }

    // Try L2 cache
    entry = this.l2Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.promoteToL1(key, entry);
      this.emit('cache:hit', key, 'L2');
      this.cacheMetrics.l2Metrics.hitRate++;
      return entry.value;
    }

    // Try L3 cache
    entry = this.l3Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.promoteToL2(key, entry);
      this.emit('cache:hit', key, 'L3');
      this.cacheMetrics.l3Metrics.hitRate++;
      return entry.value;
    }

    // Cache miss
    this.emit('cache:miss', key, 'ALL');
    this.cacheMetrics.l1Metrics.missRate++;
    return null;
  }

  /**
   * Store symbol information in cache
   */
  async putSymbol(symbolName: string, projectPath: string, symbol: SymbolInfo): Promise<void> {
    const key = `symbol:${symbolName}:${projectPath}`;
    const entry = this.createCacheEntry(key, symbol, this.config.l1Cache.ttl);

    // Store in L1 cache
    await this.putInL1Cache(key, entry);

    // Update dependency graph
    this.dependencyGraph.addSymbol(symbolName, symbol.dependencies);

    // Watch file for changes
    this.fileWatcher.watchFile(symbol.location.file);
  }

  /**
   * Get AST node from cache
   */
  async getAST(filePath: string): Promise<ASTNode | null> {
    const key = `ast:${filePath}`;

    // Try L2 cache (AST nodes are typically stored here)
    let entry = this.l2Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.emit('cache:hit', key, 'L2');
      this.cacheMetrics.l2Metrics.hitRate++;
      return entry.value;
    }

    // Try L3 cache
    entry = this.l3Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.promoteToL2(key, entry);
      this.emit('cache:hit', key, 'L3');
      this.cacheMetrics.l3Metrics.hitRate++;
      return entry.value;
    }

    this.emit('cache:miss', key, 'ALL');
    this.cacheMetrics.l2Metrics.missRate++;
    return null;
  }

  /**
   * Store AST node in cache
   */
  async putAST(filePath: string, ast: ASTNode): Promise<void> {
    const key = `ast:${filePath}`;
    const entry = this.createCacheEntry(key, ast, this.config.l2Cache.ttl);

    // Store in L2 cache (preferred for AST nodes)
    await this.putInL2Cache(key, entry);

    // Watch file for changes
    this.fileWatcher.watchFile(filePath);
  }

  /**
   * Get type information from cache
   */
  async getTypeInfo(typeName: string, projectPath: string): Promise<TypeInfo | null> {
    const key = `type:${typeName}:${projectPath}`;

    // Try L1 cache first
    let entry = this.l1Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.emit('cache:hit', key, 'L1');
      this.cacheMetrics.l1Metrics.hitRate++;
      return entry.value;
    }

    // Try L2 cache
    entry = this.l2Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.updateAccessTime(entry);
      this.promoteToL1(key, entry);
      this.emit('cache:hit', key, 'L2');
      this.cacheMetrics.l2Metrics.hitRate++;
      return entry.value;
    }

    this.emit('cache:miss', key, 'ALL');
    this.cacheMetrics.l1Metrics.missRate++;
    return null;
  }

  /**
   * Store type information in cache
   */
  async putTypeInfo(typeName: string, projectPath: string, typeInfo: TypeInfo): Promise<void> {
    const key = `type:${typeName}:${projectPath}`;
    const entry = this.createCacheEntry(key, typeInfo, this.config.l1Cache.ttl);

    // Store in L1 cache
    await this.putInL1Cache(key, entry);
  }

  /**
   * Warm cache with frequently accessed symbols
   */
  async warmCache(projectPath: string): Promise<void> {
    const hotSymbols = await this.getHotSymbols(projectPath);

    for (const symbolName of hotSymbols) {
      // Check if already cached
      const cached = await this.getSymbol(symbolName, projectPath);
      if (!cached) {
        // Trigger symbol resolution (this would typically call Serena MCP)
        this.emit('cache:warm-request', symbolName, projectPath);
      }
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern: string, reason: string): Promise<void> {
    const affectedKeys = this.findMatchingKeys(pattern);

    for (const key of affectedKeys) {
      this.l1Cache.delete(key);
      this.l2Cache.delete(key);
      this.l3Cache.delete(key);
    }

    this.emit('cache:invalidation', affectedKeys, reason);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    const allKeys = [
      ...this.l1Cache.keys(),
      ...this.l2Cache.keys(),
      ...this.l3Cache.keys()
    ];

    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();

    this.emit('cache:cleared', allKeys);
  }

  // ===== PRIVATE IMPLEMENTATION =====

  private async putInL1Cache(key: string, entry: CacheEntry<any>): Promise<void> {
    // Check if we need to evict entries
    if (this.shouldEvictL1()) {
      await this.evictL1Entries();
    }

    this.l1Cache.set(key, entry);
  }

  private async putInL2Cache(key: string, entry: CacheEntry<any>): Promise<void> {
    // Check if we need to evict entries
    if (this.shouldEvictL2()) {
      await this.evictL2Entries();
    }

    this.l2Cache.set(key, entry);
  }

  private async putInL3Cache(key: string, entry: CacheEntry<any>): Promise<void> {
    // Check if we need to evict entries
    if (this.shouldEvictL3()) {
      await this.evictL3Entries();
    }

    this.l3Cache.set(key, entry);
  }

  private promoteToL1(key: string, entry: CacheEntry<any>): void {
    // Create new entry for L1 with shorter TTL
    const l1Entry = {
      ...entry,
      ttl: this.config.l1Cache.ttl,
      timestamp: new Date()
    };

    this.l1Cache.set(key, l1Entry);
  }

  private promoteToL2(key: string, entry: CacheEntry<any>): void {
    // Create new entry for L2 with appropriate TTL
    const l2Entry = {
      ...entry,
      ttl: this.config.l2Cache.ttl,
      timestamp: new Date()
    };

    this.l2Cache.set(key, l2Entry);
  }

  private createCacheEntry<T>(key: string, value: T, ttl: number): CacheEntry<T> {
    return {
      key,
      value,
      timestamp: new Date(),
      ttl,
      size: this.calculateSize(value),
      accessCount: 1,
      lastAccessed: new Date(),
      dirty: false
    };
  }

  private calculateSize(value: any): number {
    // Rough estimate of memory size
    return JSON.stringify(value).length * 2; // UTF-16 encoding
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp.getTime() > entry.ttl;
  }

  private updateAccessTime(entry: CacheEntry<any>): void {
    entry.lastAccessed = new Date();
    entry.accessCount++;
  }

  private shouldEvictL1(): boolean {
    return this.getCurrentL1Size() > this.config.l1Cache.maxSize * 1024 * 1024;
  }

  private shouldEvictL2(): boolean {
    return this.getCurrentL2Size() > this.config.l2Cache.maxSize * 1024 * 1024;
  }

  private shouldEvictL3(): boolean {
    return this.getCurrentL3Size() > this.config.l3Cache.maxSize * 1024 * 1024;
  }

  private getCurrentL1Size(): number {
    let size = 0;
    for (const entry of this.l1Cache.values()) {
      size += entry.size;
    }
    return size;
  }

  private getCurrentL2Size(): number {
    let size = 0;
    for (const entry of this.l2Cache.values()) {
      size += entry.size;
    }
    return size;
  }

  private getCurrentL3Size(): number {
    let size = 0;
    for (const entry of this.l3Cache.values()) {
      size += entry.size;
    }
    return size;
  }

  private async evictL1Entries(): Promise<void> {
    const entries = Array.from(this.l1Cache.entries());

    // Sort by access time (LRU)
    entries.sort((a, b) =>
      a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
    );

    // Remove oldest 25% of entries
    const evictCount = Math.floor(entries.length * 0.25);
    const evictedKeys: string[] = [];

    for (let i = 0; i < evictCount; i++) {
      const [key, entry] = entries[i];
      this.l1Cache.delete(key);
      evictedKeys.push(key);

      // Move to L2 cache if valuable
      if (entry.accessCount > 5) {
        await this.putInL2Cache(key, entry);
      }
    }

    this.emit('cache:eviction', evictedKeys, 'L1');
    this.cacheMetrics.l1Metrics.evictionRate += evictCount;
  }

  private async evictL2Entries(): Promise<void> {
    const entries = Array.from(this.l2Cache.entries());

    // Sort by access time (LRU)
    entries.sort((a, b) =>
      a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
    );

    // Remove oldest 25% of entries
    const evictCount = Math.floor(entries.length * 0.25);
    const evictedKeys: string[] = [];

    for (let i = 0; i < evictCount; i++) {
      const [key, entry] = entries[i];
      this.l2Cache.delete(key);
      evictedKeys.push(key);

      // Move to L3 cache if valuable
      if (entry.accessCount > 10) {
        await this.putInL3Cache(key, entry);
      }
    }

    this.emit('cache:eviction', evictedKeys, 'L2');
    this.cacheMetrics.l2Metrics.evictionRate += evictCount;
  }

  private async evictL3Entries(): Promise<void> {
    const entries = Array.from(this.l3Cache.entries());

    // Sort by access time (LRU)
    entries.sort((a, b) =>
      a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
    );

    // Remove oldest 25% of entries
    const evictCount = Math.floor(entries.length * 0.25);
    const evictedKeys: string[] = [];

    for (let i = 0; i < evictCount; i++) {
      const [key] = entries[i];
      this.l3Cache.delete(key);
      evictedKeys.push(key);
    }

    this.emit('cache:eviction', evictedKeys, 'L3');
    this.cacheMetrics.l3Metrics.evictionRate += evictCount;
  }

  private handleFileChange(filePath: string): void {
    // Find all cache entries that depend on this file
    const affectedKeys = this.findKeysAffectedByFile(filePath);

    // Create invalidation task
    const task: InvalidationTask = {
      symbol: filePath,
      reason: 'file_changed',
      priority: 'high',
      affectedFiles: [filePath],
      timestamp: new Date()
    };

    this.invalidationQueue.push(task);

    // Process invalidation based on strategy
    if (this.config.invalidationStrategy === 'aggressive') {
      this.processInvalidationTask(task);
    } else if (this.config.invalidationStrategy === 'smart') {
      this.processSmartInvalidation(task);
    }
  }

  private findKeysAffectedByFile(filePath: string): string[] {
    const affectedKeys: string[] = [];

    // Check all cache levels
    for (const [key, entry] of this.l1Cache.entries()) {
      if (this.isKeyAffectedByFile(key, entry.value, filePath)) {
        affectedKeys.push(key);
      }
    }

    for (const [key, entry] of this.l2Cache.entries()) {
      if (this.isKeyAffectedByFile(key, entry.value, filePath)) {
        affectedKeys.push(key);
      }
    }

    for (const [key, entry] of this.l3Cache.entries()) {
      if (this.isKeyAffectedByFile(key, entry.value, filePath)) {
        affectedKeys.push(key);
      }
    }

    return affectedKeys;
  }

  private isKeyAffectedByFile(key: string, value: any, filePath: string): boolean {
    // Check if the cache entry relates to the changed file
    if (value && value.location && value.location.file === filePath) {
      return true;
    }

    // Check dependencies
    if (value && value.dependencies) {
      return this.dependencyGraph.isAffectedBy(key, filePath);
    }

    return false;
  }

  private processInvalidationTask(task: InvalidationTask): void {
    // Aggressive invalidation - remove all affected entries
    for (const filePath of task.affectedFiles) {
      const affectedKeys = this.findKeysAffectedByFile(filePath);

      for (const key of affectedKeys) {
        this.l1Cache.delete(key);
        this.l2Cache.delete(key);
        this.l3Cache.delete(key);
      }

      if (affectedKeys.length > 0) {
        this.emit('cache:invalidation', affectedKeys, task.reason);
      }
    }
  }

  private processSmartInvalidation(task: InvalidationTask): void {
    // Smart invalidation - only invalidate directly affected entries
    const directlyAffected = this.dependencyGraph.getDirectlyAffected(task.symbol);

    for (const symbol of directlyAffected) {
      const keys = this.findKeysForSymbol(symbol);

      for (const key of keys) {
        this.l1Cache.delete(key);
        this.l2Cache.delete(key);
        this.l3Cache.delete(key);
      }

      if (keys.length > 0) {
        this.emit('cache:invalidation', keys, task.reason);
      }
    }
  }

  private findKeysForSymbol(symbol: string): string[] {
    const keys: string[] = [];

    for (const key of this.l1Cache.keys()) {
      if (key.includes(symbol)) {
        keys.push(key);
      }
    }

    for (const key of this.l2Cache.keys()) {
      if (key.includes(symbol)) {
        keys.push(key);
      }
    }

    for (const key of this.l3Cache.keys()) {
      if (key.includes(symbol)) {
        keys.push(key);
      }
    }

    return keys;
  }

  private findMatchingKeys(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keys: string[] = [];

    for (const key of this.l1Cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    for (const key of this.l2Cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    for (const key of this.l3Cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  private async getHotSymbols(projectPath: string): Promise<string[]> {
    // Return frequently accessed symbols based on access patterns
    const hotSymbols: string[] = [];
    const symbolAccess = new Map<string, number>();

    // Analyze access patterns from all cache levels
    for (const [key, entry] of this.l1Cache.entries()) {
      if (key.startsWith('symbol:') && key.includes(projectPath)) {
        const symbol = key.split(':')[1];
        symbolAccess.set(symbol, (symbolAccess.get(symbol) || 0) + entry.accessCount);
      }
    }

    // Sort by access count and return top symbols
    const sortedSymbols = Array.from(symbolAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50); // Top 50 symbols

    return sortedSymbols.map(([symbol]) => symbol);
  }

  private performMaintenance(): void {
    // Remove expired entries
    this.removeExpiredEntries();

    // Update metrics
    this.updateMetrics();

    // Process invalidation queue
    this.processInvalidationQueue();
  }

  private removeExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Check L1 cache
    for (const [key, entry] of this.l1Cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.l1Cache.delete(key);
        expiredKeys.push(key);
      }
    }

    // Check L2 cache
    for (const [key, entry] of this.l2Cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.l2Cache.delete(key);
        expiredKeys.push(key);
      }
    }

    // Check L3 cache
    for (const [key, entry] of this.l3Cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.l3Cache.delete(key);
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      this.emit('cache:eviction', expiredKeys, 'expired');
    }
  }

  private updateMetrics(): void {
    // Update cache metrics
    this.cacheMetrics.l1Metrics.size = this.getCurrentL1Size();
    this.cacheMetrics.l1Metrics.maxSize = this.config.l1Cache.maxSize * 1024 * 1024;

    this.cacheMetrics.l2Metrics.size = this.getCurrentL2Size();
    this.cacheMetrics.l2Metrics.maxSize = this.config.l2Cache.maxSize * 1024 * 1024;

    this.cacheMetrics.l3Metrics.size = this.getCurrentL3Size();
    this.cacheMetrics.l3Metrics.maxSize = this.config.l3Cache.maxSize * 1024 * 1024;

    // Calculate overall hit rate
    const totalHits = this.cacheMetrics.l1Metrics.hitRate +
                     this.cacheMetrics.l2Metrics.hitRate +
                     this.cacheMetrics.l3Metrics.hitRate;
    const totalMisses = this.cacheMetrics.l1Metrics.missRate +
                       this.cacheMetrics.l2Metrics.missRate +
                       this.cacheMetrics.l3Metrics.missRate;

    this.cacheMetrics.overallHitRate = totalHits / (totalHits + totalMisses);
  }

  private processInvalidationQueue(): void {
    // Process pending invalidation tasks
    while (this.invalidationQueue.length > 0) {
      const task = this.invalidationQueue.shift()!;

      if (this.config.invalidationStrategy === 'smart') {
        this.processSmartInvalidation(task);
      } else {
        this.processInvalidationTask(task);
      }
    }
  }

  private initializeMetrics(): CacheMetrics {
    return {
      l1Metrics: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        avgLatency: 0,
        size: 0,
        maxSize: this.config.l1Cache.maxSize * 1024 * 1024
      },
      l2Metrics: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        avgLatency: 0,
        size: 0,
        maxSize: this.config.l2Cache.maxSize * 1024 * 1024
      },
      l3Metrics: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        avgLatency: 0,
        size: 0,
        maxSize: this.config.l3Cache.maxSize * 1024 * 1024
      },
      overallHitRate: 0,
      invalidationEvents: 0
    };
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update metrics every 30 seconds
  }

  // ===== CLEANUP =====

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.fileWatcher.shutdown();
    await this.clear();
  }
}

// ===== SUPPORTING CLASSES =====

class SerenaDependencyGraph implements DependencyGraph {
  nodes: Map<string, Set<string>>;
  reverseNodes: Map<string, Set<string>>;

  constructor() {
    this.nodes = new Map();
    this.reverseNodes = new Map();
  }

  addDependency(source: string, target: string): void {
    if (!this.nodes.has(source)) {
      this.nodes.set(source, new Set());
    }
    if (!this.reverseNodes.has(target)) {
      this.reverseNodes.set(target, new Set());
    }

    this.nodes.get(source)!.add(target);
    this.reverseNodes.get(target)!.add(source);
  }

  removeDependency(source: string, target: string): void {
    this.nodes.get(source)?.delete(target);
    this.reverseNodes.get(target)?.delete(source);
  }

  getDependents(symbol: string): string[] {
    return Array.from(this.reverseNodes.get(symbol) || []);
  }

  getDependencies(symbol: string): string[] {
    return Array.from(this.nodes.get(symbol) || []);
  }

  getTransitiveDependents(symbol: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (s: string) => {
      if (visited.has(s)) return;
      visited.add(s);

      const dependents = this.getDependents(s);
      for (const dependent of dependents) {
        result.push(dependent);
        visit(dependent);
      }
    };

    visit(symbol);
    return result;
  }

  addSymbol(symbol: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      this.addDependency(symbol, dep);
    }
  }

  isAffectedBy(symbol: string, changedFile: string): boolean {
    // Check if symbol depends on the changed file
    const dependencies = this.getDependencies(symbol);
    return dependencies.includes(changedFile);
  }

  getDirectlyAffected(symbol: string): string[] {
    // Return symbols directly affected by changes to this symbol
    return this.getDependents(symbol);
  }
}

class FileSystemWatcher extends EventEmitter {
  private watchers: Map<string, any>;

  constructor() {
    super();
    this.watchers = new Map();
  }

  watchFile(filePath: string): void {
    if (this.watchers.has(filePath)) {
      return; // Already watching
    }

    try {
      const watcher = watch(filePath, (eventType) => {
        if (eventType === 'change') {
          this.emit('file-changed', filePath);
        }
      });

      this.watchers.set(filePath, watcher);
    } catch (error) {
      // File might not exist or be inaccessible
      console.warn(`Failed to watch file: ${filePath}`, error);
    }
  }

  shutdown(): void {
    for (const [filePath, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        console.warn(`Failed to close watcher for ${filePath}`, error);
      }
    }
    this.watchers.clear();
  }
}
