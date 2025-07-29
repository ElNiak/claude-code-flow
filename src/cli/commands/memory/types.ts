/**
 * Memory system TypeScript interfaces
 * Part of Phase 1B TypeScript migration architecture
 */

export interface MemoryEntry {
	key: string;
	value: string;
	namespace: string;
	timestamp: number;
	ttl?: number;
	tags?: string[];
	compressed?: boolean;
}

export interface MemoryStore {
	[namespace: string]: MemoryEntry[];
}

export interface MemoryOperationOptions {
	namespace?: string;
	format?: "json" | "text";
	limit?: number;
	compress?: boolean;
	searchType?: "exact" | "partial" | "regex";
	ttl?: number;
	tags?: string[];
}

export interface MemoryQueryResult {
	entries: MemoryEntry[];
	totalCount: number;
	searchTime: number;
}

export interface MemoryStats {
	totalEntries: number;
	namespaces: number;
	sizeBytes: number;
	namespaceBreakdown: Record<string, number>;
}

export interface MemoryExportOptions {
	namespace?: string;
	filename?: string;
	format?: "json" | "text";
	compress?: boolean;
}

export interface MemoryImportOptions {
	filename: string;
	namespace?: string;
	merge?: boolean;
	overwrite?: boolean;
}

export interface MemoryOptimizationOptions {
	removeExpired?: boolean;
	compressLarge?: boolean;
	deduplicateValues?: boolean;
	reindexNamespaces?: boolean;
}

export type MemorySearchType = "exact" | "partial" | "regex" | "fuzzy";

export interface MemoryAdvancedQuery {
	pattern: string;
	searchType: MemorySearchType;
	namespace?: string;
	tags?: string[];
	dateRange?: {
		start: number;
		end: number;
	};
	limit?: number;
	offset?: number;
}
