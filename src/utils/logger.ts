/**
 * Simple logger utility for the claude-flow project
 */

export interface ILogger {
	debug(message: string, meta?: any): void;
	info(message: string, meta?: any): void;
	warn(message: string, meta?: any): void;
	error(message: string, meta?: any): void;
	configure(): Promise<void>;
}

export class Logger implements ILogger {
	private debugEnabled: boolean =
		process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
	debug(message: string, meta?: any): void {
		if (this.debugEnabled) {
			console.debug(`[DEBUG] ${message}`, meta || "");
		}
	}

	info(message: string, meta?: any): void {
		console.info(`[INFO] ${message}`, meta || "");
	}

	warn(message: string, meta?: any): void {
		console.warn(`[WARN] ${message}`, meta || "");
	}

	error(message: string, meta?: any): void {
		console.error(`[ERROR] ${message}`, meta || "");
	}

	async configure(): Promise<void> {
		// Configuration logic if needed
	}
}

export const logger = new Logger();
export default logger;
