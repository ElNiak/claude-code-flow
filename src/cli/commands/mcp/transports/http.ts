import { getErrorMessage as _getErrorMessage } from "../../shared/errors/error-handler.js";
/**
 * HTTP transport for MCP
 */

import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import {
	createServer as createHttpsServer,
	type Server as HttpsServer,
} from "node:https";
import { parse } from "node:url";
import type { ILogger } from "../../core/logger.js";
import { MCPTransportError } from "../../shared/errors/errors.js";
import type {
	MCPNotification,
	MCPRequest,
	MCPResponse,
} from "../../shared/types/utils-types.js";
import type {
	ITransport,
	NotificationHandler,
	RequestHandler,
} from "./base.js";

/**
 * HTTP transport implementation for MCP
 */
export class HttpTransport implements ITransport {
	private server?: Server | HttpsServer;
	private requestHandler?: RequestHandler;
	private notificationHandler?: NotificationHandler;
	private running = false;
	private requestCount = 0;
	private responseTime = 0;

	constructor(
		private host: string,
		private port: number,
		private tlsEnabled: boolean,
		private logger: ILogger,
	) {}

	async start(): Promise<void> {
		if (this.running) {
			throw new MCPTransportError("HTTP transport already running");
		}

		this.logger.info("Starting HTTP transport", {
			host: this.host,
			port: this.port,
			tls: this.tlsEnabled,
		});

		try {
			// Create HTTP or HTTPS server
			this.server = this.tlsEnabled ? createHttpsServer() : createServer();

			// Set up request handler
			this.server.on(
				"request",
				async (req: IncomingMessage, res: ServerResponse) => {
					await this.handleHttpRequest(req, res);
				},
			);

			// Start listening
			await new Promise<void>((resolve, reject) => {
				this.server!.listen(this.port, this.host, (error?: Error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			this.running = true;
			this.logger.info("HTTP transport started", {
				host: this.host,
				port: this.port,
			});
		} catch (error) {
			throw new MCPTransportError("Failed to start HTTP transport", { error });
		}
	}

	async stop(): Promise<void> {
		if (!this.running) {
			return;
		}

		this.logger.info("Stopping HTTP transport");

		if (this.server) {
			await new Promise<void>((resolve) => {
				this.server!.close(() => {
					resolve();
				});
			});
			this.server = undefined;
		}

		this.running = false;
		this.logger.info("HTTP transport stopped");
	}

	async connect(): Promise<void> {
		// For HTTP transport, connect is handled by start()
		if (!this.running) {
			await this.start();
		}
	}

	async disconnect(): Promise<void> {
		// For HTTP transport, disconnect is handled by stop()
		await this.stop();
	}

	onRequest(handler: RequestHandler): void {
		this.requestHandler = handler;
	}

	onNotification(handler: NotificationHandler): void {
		this.notificationHandler = handler;
	}

	async sendRequest(request: MCPRequest): Promise<MCPResponse> {
		// HTTP transport typically doesn't send requests, it receives them
		// This would be used for client-side HTTP transport
		throw new MCPTransportError(
			"HTTP transport doesn't support sending requests",
		);
	}

	async sendNotification(notification: MCPNotification): Promise<void> {
		// HTTP transport typically doesn't send notifications, it receives them
		// This would be used for client-side HTTP transport
		throw new MCPTransportError(
			"HTTP transport doesn't support sending notifications",
		);
	}

	async getHealthStatus(): Promise<{
		healthy: boolean;
		error?: string;
		metrics?: Record<string, number>;
	}> {
		return {
			healthy: this.running,
			metrics: {
				requestCount: this.requestCount,
				averageResponseTime: this.responseTime,
				port: this.port,
				tlsEnabled: this.tlsEnabled ? 1 : 0,
			},
		};
	}

	private async handleHttpRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const startTime = Date.now();
		this.requestCount++;

		try {
			// Handle CORS
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");

			if (req.method === "OPTIONS") {
				res.writeHead(200);
				res.end();
				return;
			}

			if (req.method !== "POST") {
				res.writeHead(405, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32600,
							message: "Method not allowed",
						},
					}),
				);
				return;
			}

			// Parse request body
			const body = await this.parseRequestBody(req);

			let mcpRequest: MCPRequest;
			try {
				mcpRequest = JSON.parse(body);
			} catch (error) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32700,
							message: "Parse error",
						},
					}),
				);
				return;
			}

			// Validate JSON-RPC
			if (!mcpRequest.jsonrpc || mcpRequest.jsonrpc !== "2.0") {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						jsonrpc: "2.0",
						id: mcpRequest.id,
						error: {
							code: -32600,
							message: "Invalid JSON-RPC version",
						},
					}),
				);
				return;
			}

			// Handle request or notification
			if (mcpRequest.id === undefined) {
				// This is a notification
				if (this.notificationHandler) {
					await this.notificationHandler(mcpRequest as MCPNotification);
				}
				res.writeHead(204);
				res.end();
			} else {
				// This is a request
				if (!this.requestHandler) {
					res.writeHead(503, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							error: {
								code: -32603,
								message: "No request handler registered",
							},
						}),
					);
					return;
				}

				try {
					const response = await this.requestHandler(mcpRequest);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify(response));
				} catch (error) {
					this.logger.error("Request handler error", { error });
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							error: {
								code: -32603,
								message: "Internal error",
								data: error instanceof Error ? error.message : String(error),
							},
						}),
					);
				}
			}
		} catch (error) {
			this.logger.error("HTTP request handling error", { error });
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message: "Internal error",
					},
				}),
			);
		} finally {
			// Update response time metrics
			const endTime = Date.now();
			this.responseTime = (this.responseTime + (endTime - startTime)) / 2;
		}
	}

	private async parseRequestBody(req: IncomingMessage): Promise<string> {
		return new Promise((resolve, reject) => {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				resolve(body);
			});
			req.on("error", (error) => {
				reject(error);
			});
		});
	}
}
