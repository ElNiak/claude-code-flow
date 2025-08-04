/**
 * Message Bus for inter-agent communication
 */

import { EventEmitter } from 'events';
import { logger } from '../core/logger.js';

// Type guards and utility functions
function hasAgentId(data: unknown): data is { agentId: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'agentId' in data &&
    typeof (data as any).agentId === 'string'
  );
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'system';
  payload: Record<string, unknown>;
  timestamp: Date;
  priority?: number;
}

export interface DeliveryOptions {
  timeout?: number;
  retries?: number;
  priority?: number;
}

export interface MessageFilter {
  type?: string;
  from?: string;
  to?: string;
  priority?: number;
}

class DeliveryManager extends EventEmitter {
  private pendingDeliveries = new Map<
    string,
    {
      message: Message;
      retries: number;
      maxRetries: number;
      timeout: NodeJS.Timeout;
    }
  >();

  async deliver(message: Message, options: DeliveryOptions = {}): Promise<void> {
    const maxRetries = options.retries || 3;
    const timeout = options.timeout || 30000;

    const deliveryId = `${message.id}-${Date.now()}`;

    const timeoutHandle = setTimeout(() => {
      this.handleDeliveryTimeout(deliveryId);
    }, timeout);

    this.pendingDeliveries.set(deliveryId, {
      message,
      retries: 0,
      maxRetries,
      timeout: timeoutHandle,
    });

    try {
      await this.attemptDelivery(message);
      this.handleDeliverySuccess({ deliveryId, message });
    } catch (error) {
      this.handleDeliveryFailure({ deliveryId, message, error });
    }
  }

  private async attemptDelivery(message: Message): Promise<void> {
    // Simulate message delivery
    logger.debug('Attempting message delivery', {
      messageId: message.id,
      from: message.from,
      to: message.to,
    });

    // This would contain actual delivery logic
    // For now, just resolve successfully
    return Promise.resolve();
  }

  private handleDeliveryTimeout(deliveryId: string): void {
    const delivery = this.pendingDeliveries.get(deliveryId);
    if (delivery) {
      this.pendingDeliveries.delete(deliveryId);
      this.emit('delivery:timeout', { deliveryId, message: delivery.message });
    }
  }

  private handleDeliverySuccess(data: { deliveryId: string; message: Message }): void {
    const delivery = this.pendingDeliveries.get(data.deliveryId);
    if (delivery) {
      clearTimeout(delivery.timeout);
      this.pendingDeliveries.delete(data.deliveryId);
    }
    this.emit('delivery:success', data);
  }

  private handleDeliveryFailure(data: {
    deliveryId: string;
    message: Message;
    error: unknown;
  }): void {
    const delivery = this.pendingDeliveries.get(data.deliveryId);
    if (delivery) {
      if (delivery.retries < delivery.maxRetries) {
        delivery.retries++;
        // Retry delivery
        this.attemptDelivery(delivery.message).catch((error) => {
          this.handleDeliveryFailure({ ...data, error });
        });
      } else {
        clearTimeout(delivery.timeout);
        this.pendingDeliveries.delete(data.deliveryId);
        this.emit('delivery:failure', data);
      }
    }
  }
}

export class MessageBus extends EventEmitter {
  private subscribers = new Map<string, Set<string>>();
  private messageHistory: Message[] = [];
  private deliveryManager = new DeliveryManager();
  private maxHistorySize = 1000;

  constructor(private eventBus: EventEmitter) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Send a message to specific agent or broadcast
   */
  async send(
    message: Omit<Message, 'id' | 'timestamp'>,
    options: DeliveryOptions = {},
  ): Promise<string> {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
    };

    // Add to history
    this.addToHistory(fullMessage);

    // Log message
    logger.debug('Message sent', {
      messageId: fullMessage.id,
      type: fullMessage.type,
      from: fullMessage.from,
      to: fullMessage.to,
    });

    // Deliver message
    await this.deliveryManager.deliver(fullMessage, options);

    // Emit event
    this.emit('message:sent', fullMessage);

    return fullMessage.id;
  }

  /**
   * Subscribe agent to message types
   */
  subscribe(agentId: string, messageTypes: string[]): void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }

    const agentSubscriptions = this.subscribers.get(agentId)!;
    messageTypes.forEach((type) => agentSubscriptions.add(type));

    logger.debug('Agent subscribed to message types', { agentId, messageTypes });
  }

  /**
   * Unsubscribe agent from message types
   */
  unsubscribe(agentId: string, messageTypes?: string[]): void {
    const agentSubscriptions = this.subscribers.get(agentId);
    if (!agentSubscriptions) return;

    if (messageTypes) {
      messageTypes.forEach((type) => agentSubscriptions.delete(type));
    } else {
      agentSubscriptions.clear();
    }

    if (agentSubscriptions.size === 0) {
      this.subscribers.delete(agentId);
    }

    logger.debug('Agent unsubscribed from message types', { agentId, messageTypes });
  }

  /**
   * Get message history with optional filtering
   */
  getHistory(filter?: MessageFilter, limit = 100): Message[] {
    let messages = this.messageHistory;

    if (filter) {
      messages = messages.filter((msg) => {
        if (filter.type && msg.type !== filter.type) return false;
        if (filter.from && msg.from !== filter.from) return false;
        if (filter.to && msg.to !== filter.to) return false;
        if (filter.priority && msg.priority !== filter.priority) return false;
        return true;
      });
    }

    return messages.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    logger.info('Message history cleared');
  }

  /**
   * Get active subscribers
   */
  getSubscribers(): Map<string, Set<string>> {
    return new Map(this.subscribers);
  }

  /**
   * Broadcast message to all subscribers
   */
  async broadcast(
    message: Omit<Message, 'id' | 'timestamp' | 'to'>,
    options: DeliveryOptions = {},
  ): Promise<string[]> {
    const messageIds: string[] = [];

    for (const [agentId, subscriptions] of this.subscribers) {
      if (subscriptions.has(message.type) || subscriptions.has('*')) {
        const messageId = await this.send(
          {
            ...message,
            to: agentId,
          },
          options,
        );
        messageIds.push(messageId);
      }
    }

    return messageIds;
  }

  private setupEventHandlers(): void {
    this.eventBus.on('agent:connected', (data: unknown) => {
      if (hasAgentId(data)) {
        this.handleAgentConnected((data as { agentId: string }).agentId);
      }
    });

    this.eventBus.on('agent:disconnected', (data: unknown) => {
      if (hasAgentId(data)) {
        this.handleAgentDisconnected((data as { agentId: string }).agentId);
      }
    });

    this.deliveryManager.on('delivery:success', (data) => {
      this.handleDeliverySuccess(data);
    });

    this.deliveryManager.on('delivery:failure', (data) => {
      this.handleDeliveryFailure(data);
    });

    this.deliveryManager.on('delivery:timeout', (data) => {
      this.handleDeliveryTimeout(data);
    });
  }

  private handleAgentConnected(agentId: string): void {
    logger.info('Agent connected to message bus', { agentId });
    this.emit('agent:connected', { agentId });
  }

  private handleAgentDisconnected(agentId: string): void {
    // Clean up subscriptions
    this.subscribers.delete(agentId);
    logger.info('Agent disconnected from message bus', { agentId });
    this.emit('agent:disconnected', { agentId });
  }

  private handleDeliverySuccess(data: { deliveryId: string; message: Message }): void {
    logger.debug('Message delivered successfully', {
      messageId: data.message.id,
      deliveryId: data.deliveryId,
    });
    this.emit('message:delivered', data.message);
  }

  private handleDeliveryFailure(data: {
    deliveryId: string;
    message: Message;
    error: unknown;
  }): void {
    logger.error('Message delivery failed', {
      messageId: data.message.id,
      deliveryId: data.deliveryId,
      error: data.error instanceof Error ? data.error.message : String(data.error),
    });
    this.emit('message:failed', { message: data.message, error: data.error });
  }

  private handleDeliveryTimeout(data: { deliveryId: string; message: Message }): void {
    logger.warn('Message delivery timeout', {
      messageId: data.message.id,
      deliveryId: data.deliveryId,
    });
    this.emit('message:timeout', data.message);
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(message: Message): void {
    this.messageHistory.push(message);

    // Trim history if it exceeds max size
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get message bus statistics
   */
  getStats(): {
    totalMessages: number;
    activeSubscribers: number;
    pendingDeliveries: number;
    historySize: number;
  } {
    return {
      totalMessages: this.messageHistory.length,
      activeSubscribers: this.subscribers.size,
      pendingDeliveries: (this.deliveryManager as any).pendingDeliveries?.size || 0,
      historySize: this.messageHistory.length,
    };
  }
}

export default MessageBus;
