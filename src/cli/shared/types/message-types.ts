/**
 * Missing Message Types - Type Foundation
 *
 * These types were referenced but not properly defined.
 */

export interface Message {
	_id: string;
	type: string;
	from: string;
	to: string;
	timestamp: Date;
	payload: any;
	correlationId?: string;
	replyTo?: string;
}

export interface MessageEnvelope {
	message: Message;
	headers: Record<string, string>;
	_metadata: Record<string, any>;
}

export type MessageHandler = (_message: Message) => Promise<void> | void;

export interface MessageRouter {
	route(_message: Message): Promise<void>;
	addRoute(pattern: string, _handler: MessageHandler): void;
	removeRoute(pattern: string): void;
}

export class DefaultMessageRouter implements MessageRouter {
	private routes = new Map<string, MessageHandler>();

	async route(message: Message): Promise<void> {
		for (const [pattern, handler] of this.routes) {
			if (this.matchesPattern(message.type, pattern)) {
				await handler(message);
			}
		}
	}

	addRoute(pattern: string, handler: MessageHandler): void {
		this.routes.set(pattern, handler);
	}

	removeRoute(pattern: string): void {
		this.routes.delete(pattern);
	}

	private matchesPattern(messageType: string, pattern: string): boolean {
		// Simple pattern matching - can be enhanced with regex,
		return messageType === pattern || pattern === "*";
	}
}

// Remove duplicate exports - interfaces and class are already exported above
