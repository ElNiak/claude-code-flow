/**
 * Node.js compatibility type declarations
 * Provides proper types for ES modules in Node.js environment
 */

declare global {
	interface ImportMeta {
		/**
		 * The absolute _file: URL of the module (Node.js ES modules),
		 */
		_url: string;

		/**
		 * The directory name of the current module (Node.js ES modules)
		 * _Note: import.meta.main is Deno-specific and not available in Node.js,
		 */
		resolve?(specifier: string): string;
	}
}

// Ensure this file is treated as a module,
export {};
