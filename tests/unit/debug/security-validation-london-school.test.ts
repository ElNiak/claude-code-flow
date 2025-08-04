/**
 * TDD London School: Security Validation Testing
 * Mock-driven testing for PII redaction, data masking, and security compliance
 */

import { jest } from '@jest/globals';
import {
  LondonSchoolMockFactory,
  IDebugLogger,
  IMemoryMonitor,
  ContractTestHelper,
} from '../../utils/london-school-test-helpers.js';

// Security interfaces for testing
interface IDataMasker {
  maskSensitiveData(data: any): any;
  isPII(data: any): boolean;
  getRedactionLevel(): 'none' | 'partial' | 'full';
  setRedactionLevel(level: 'none' | 'partial' | 'full'): void;
}

interface IPIIDetector {
  detectPII(text: string): PIIDetectionResult[];
  detectPIIInObject(obj: any): PIIDetectionResult[];
  getSupportedPIITypes(): PIIType[];
}

interface IPIIRedactor {
  redact(text: string, detections: PIIDetectionResult[]): string;
  redactObject(obj: any, detections: PIIDetectionResult[]): any;
  getRedactionStrategy(piiType: PIIType): RedactionStrategy;
}

interface PIIDetectionResult {
  type: PIIType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context?: string;
}

interface RedactionStrategy {
  type: 'mask' | 'hash' | 'remove' | 'partial';
  pattern?: string;
  preserveLength?: boolean;
  hashAlgorithm?: string;
}

type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'api_key'
  | 'password'
  | 'token'
  | 'ip_address'
  | 'name'
  | 'address';

// Mock implementations for security testing
class MockDataMasker implements IDataMasker {
  private redactionLevel: 'none' | 'partial' | 'full' = 'partial';

  maskSensitiveData = jest.fn<(data: any) => any>();
  isPII = jest.fn<(data: any) => boolean>();
  getRedactionLevel = jest
    .fn<() => 'none' | 'partial' | 'full'>()
    .mockImplementation(() => this.redactionLevel);
  setRedactionLevel = jest
    .fn<(level: 'none' | 'partial' | 'full') => void>()
    .mockImplementation((level) => {
      this.redactionLevel = level;
    });
}

class MockPIIDetector implements IPIIDetector {
  detectPII = jest.fn<(text: string) => PIIDetectionResult[]>();
  detectPIIInObject = jest.fn<(obj: any) => PIIDetectionResult[]>();
  getSupportedPIITypes = jest
    .fn<() => PIIType[]>()
    .mockReturnValue([
      'email',
      'phone',
      'ssn',
      'credit_card',
      'api_key',
      'password',
      'token',
      'ip_address',
    ]);
}

class MockPIIRedactor implements IPIIRedactor {
  redact = jest.fn<(text: string, detections: PIIDetectionResult[]) => string>();
  redactObject = jest.fn<(obj: any, detections: PIIDetectionResult[]) => any>();
  getRedactionStrategy = jest.fn<(piiType: PIIType) => RedactionStrategy>();
}

// Secure debug logger implementation
class SecureDebugLogger implements IDebugLogger {
  private dataMasker: IDataMasker;
  private piiDetector: IPIIDetector;
  private piiRedactor: IPIIRedactor;
  private baseLogger: IDebugLogger;
  private auditLog: string[] = [];

  constructor(
    dataMasker: IDataMasker,
    piiDetector: IPIIDetector,
    piiRedactor: IPIIRedactor,
    baseLogger: IDebugLogger,
  ) {
    this.dataMasker = dataMasker;
    this.piiDetector = piiDetector;
    this.piiRedactor = piiRedactor;
    this.baseLogger = baseLogger;
  }

  debug(category: string, message: string, data?: any, correlationId?: string): void {
    const secureData = this.secureData(message, data);
    this.logSecurityEvent('debug', category, secureData.hasPII);
    this.baseLogger.debug(category, secureData.message, secureData.data, correlationId);
  }

  info(category: string, message: string, data?: any, correlationId?: string): void {
    const secureData = this.secureData(message, data);
    this.logSecurityEvent('info', category, secureData.hasPII);
    this.baseLogger.info(category, secureData.message, secureData.data, correlationId);
  }

  warn(category: string, message: string, data?: any, correlationId?: string): void {
    const secureData = this.secureData(message, data);
    this.logSecurityEvent('warn', category, secureData.hasPII);
    this.baseLogger.warn(category, secureData.message, secureData.data, correlationId);
  }

  error(category: string, message: string, data?: any, correlationId?: string): void {
    const secureData = this.secureData(message, data);
    this.logSecurityEvent('error', category, secureData.hasPII);
    this.baseLogger.error(category, secureData.message, secureData.data, correlationId);
  }

  isEnabled(category: string): boolean {
    return this.baseLogger.isEnabled(category);
  }

  setEnabled(category: string, enabled: boolean): void {
    this.logSecurityEvent('config', 'category_toggle', false, { category, enabled });
    this.baseLogger.setEnabled(category, enabled);
  }

  private secureData(
    message: string,
    data?: any,
  ): { message: string; data?: any; hasPII: boolean } {
    // Detect PII in message
    const messageDetections = this.piiDetector.detectPII(message);
    let secureMessage = message;
    let hasPII = false;

    if (messageDetections.length > 0) {
      hasPII = true;
      secureMessage = this.piiRedactor.redact(message, messageDetections);
    }

    // Secure data object if present
    let secureDataObj = data;
    if (data) {
      const dataDetections = this.piiDetector.detectPIIInObject(data);
      if (dataDetections.length > 0) {
        hasPII = true;
        secureDataObj = this.piiRedactor.redactObject(data, dataDetections);
      } else if (this.dataMasker.isPII(data)) {
        hasPII = true;
        secureDataObj = this.dataMasker.maskSensitiveData(data);
      }
    }

    return {
      message: secureMessage,
      data: secureDataObj,
      hasPII,
    };
  }

  private logSecurityEvent(
    level: string,
    category: string,
    containedPII: boolean,
    metadata?: any,
  ): void {
    const auditEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      category,
      containedPII,
      redactionLevel: this.dataMasker.getRedactionLevel(),
      metadata,
    });
    this.auditLog.push(auditEntry);
  }

  // Test utility methods
  getAuditLog(): string[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }
}

describe('Security Validation Testing - London School TDD', () => {
  let mockDataMasker: MockDataMasker;
  let mockPIIDetector: MockPIIDetector;
  let mockPIIRedactor: MockPIIRedactor;
  let mockBaseLogger: jest.Mocked<IDebugLogger>;
  let secureLogger: SecureDebugLogger;

  beforeEach(() => {
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite();

    mockDataMasker = new MockDataMasker();
    mockPIIDetector = new MockPIIDetector();
    mockPIIRedactor = new MockPIIRedactor();
    mockBaseLogger = mockSuite.debugLogger;

    secureLogger = new SecureDebugLogger(
      mockDataMasker,
      mockPIIDetector,
      mockPIIRedactor,
      mockBaseLogger,
    );
  });

  describe('PII Detection and Redaction', () => {
    it('should detect and redact email addresses in log messages', () => {
      // Arrange
      const messageWithEmail = 'User john.doe@example.com logged in successfully';
      const emailDetection: PIIDetectionResult = {
        type: 'email',
        value: 'john.doe@example.com',
        confidence: 0.95,
        startIndex: 5,
        endIndex: 25,
        context: 'login',
      };

      mockPIIDetector.detectPII.mockReturnValue([emailDetection]);
      mockPIIRedactor.redact.mockReturnValue('User [EMAIL_REDACTED] logged in successfully');
      mockPIIDetector.detectPIIInObject.mockReturnValue([]);

      // Act
      secureLogger.info('auth:login', messageWithEmail);

      // Assert - Verify PII detection and redaction workflow
      expect(mockPIIDetector.detectPII).toHaveBeenCalledWith(messageWithEmail);
      expect(mockPIIRedactor.redact).toHaveBeenCalledWith(messageWithEmail, [emailDetection]);
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        'auth:login',
        'User [EMAIL_REDACTED] logged in successfully',
        undefined,
        undefined,
      );

      // Verify audit logging
      const auditLog = secureLogger.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toContain('"containedPII":true');
      expect(auditLog[0]).toContain('"level":"info"');
    });

    it('should detect and redact multiple PII types in complex data objects', () => {
      // Arrange
      const sensitiveData = {
        user: {
          email: 'user@example.com',
          phone: '555-123-4567',
          ssn: '123-45-6789',
          profile: {
            apiKey: 'sk_test_abcd1234efgh5678',
            creditCard: '4111111111111111',
          },
        },
        session: {
          token: 'jwt_token_abc123',
          ipAddress: '192.168.1.100',
        },
      };

      const multipleDetections: PIIDetectionResult[] = [
        { type: 'email', value: 'user@example.com', confidence: 0.98, startIndex: 0, endIndex: 16 },
        { type: 'phone', value: '555-123-4567', confidence: 0.92, startIndex: 0, endIndex: 12 },
        { type: 'ssn', value: '123-45-6789', confidence: 0.99, startIndex: 0, endIndex: 11 },
        {
          type: 'api_key',
          value: 'sk_test_abcd1234efgh5678',
          confidence: 0.97,
          startIndex: 0,
          endIndex: 23,
        },
        {
          type: 'credit_card',
          value: '4111111111111111',
          confidence: 0.95,
          startIndex: 0,
          endIndex: 16,
        },
        { type: 'token', value: 'jwt_token_abc123', confidence: 0.88, startIndex: 0, endIndex: 16 },
        {
          type: 'ip_address',
          value: '192.168.1.100',
          confidence: 0.9,
          startIndex: 0,
          endIndex: 13,
        },
      ];

      const redactedData = {
        user: {
          email: '[EMAIL_REDACTED]',
          phone: '[PHONE_REDACTED]',
          ssn: '[SSN_REDACTED]',
          profile: {
            apiKey: '[API_KEY_REDACTED]',
            creditCard: '[CREDIT_CARD_REDACTED]',
          },
        },
        session: {
          token: '[TOKEN_REDACTED]',
          ipAddress: '[IP_REDACTED]',
        },
      };

      mockPIIDetector.detectPII.mockReturnValue([]);
      mockPIIDetector.detectPIIInObject.mockReturnValue(multipleDetections);
      mockPIIRedactor.redactObject.mockReturnValue(redactedData);

      // Act
      secureLogger.debug('security:audit', 'Processing user data', sensitiveData);

      // Assert - Verify comprehensive PII handling
      expect(mockPIIDetector.detectPIIInObject).toHaveBeenCalledWith(sensitiveData);
      expect(mockPIIRedactor.redactObject).toHaveBeenCalledWith(sensitiveData, multipleDetections);
      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        'security:audit',
        'Processing user data',
        redactedData,
        undefined,
      );

      // Verify all PII types were detected
      expect(multipleDetections).toHaveLength(7);
      expect(multipleDetections.map((d) => d.type)).toEqual([
        'email',
        'phone',
        'ssn',
        'api_key',
        'credit_card',
        'token',
        'ip_address',
      ]);
    });

    it('should apply different redaction strategies based on PII type', () => {
      // Arrange
      const apiKeyData = { apiKey: 'sk_live_1234567890abcdef' };
      const passwordData = { password: 'MySecretPassword123!' };

      const apiKeyDetection: PIIDetectionResult = {
        type: 'api_key',
        value: 'sk_live_1234567890abcdef',
        confidence: 0.99,
        startIndex: 0,
        endIndex: 24,
      };

      const passwordDetection: PIIDetectionResult = {
        type: 'password',
        value: 'MySecretPassword123!',
        confidence: 0.95,
        startIndex: 0,
        endIndex: 20,
      };

      // Different redaction strategies
      mockPIIRedactor.getRedactionStrategy.mockImplementation((piiType: PIIType) => {
        switch (piiType) {
          case 'api_key':
            return { type: 'partial', pattern: 'sk_***...***', preserveLength: false };
          case 'password':
            return { type: 'remove', preserveLength: true };
          default:
            return { type: 'mask', pattern: '***', preserveLength: true };
        }
      });

      mockPIIDetector.detectPII.mockReturnValue([]);
      mockPIIDetector.detectPIIInObject
        .mockReturnValueOnce([apiKeyDetection])
        .mockReturnValueOnce([passwordDetection]);

      mockPIIRedactor.redactObject
        .mockReturnValueOnce({ apiKey: 'sk_***...***' })
        .mockReturnValueOnce({ password: '[REMOVED]' });

      // Act
      secureLogger.debug('security:api', 'API key usage', apiKeyData);
      secureLogger.warn('security:auth', 'Password validation', passwordData);

      // Assert - Verify strategy-specific redaction
      expect(mockPIIRedactor.getRedactionStrategy).toHaveBeenCalledWith('api_key');
      expect(mockPIIRedactor.getRedactionStrategy).toHaveBeenCalledWith('password');

      expect(mockBaseLogger.debug).toHaveBeenCalledWith(
        'security:api',
        'API key usage',
        { apiKey: 'sk_***...***' },
        undefined,
      );

      expect(mockBaseLogger.warn).toHaveBeenCalledWith(
        'security:auth',
        'Password validation',
        { password: '[REMOVED]' },
        undefined,
      );
    });
  });

  describe('Data Masking Compliance', () => {
    it('should apply configurable redaction levels', () => {
      // Arrange - Test different redaction levels
      const sensitiveMessage = 'Processing payment for card 4111-1111-1111-1111';
      const cardDetection: PIIDetectionResult = {
        type: 'credit_card',
        value: '4111-1111-1111-1111',
        confidence: 0.98,
        startIndex: 27,
        endIndex: 46,
      };

      mockPIIDetector.detectPII.mockReturnValue([cardDetection]);

      // Test 'none' redaction level
      mockDataMasker.setRedactionLevel('none');
      mockPIIRedactor.redact.mockReturnValue(sensitiveMessage); // No redaction

      secureLogger.info('payment:process', sensitiveMessage);

      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        'payment:process',
        sensitiveMessage,
        undefined,
        undefined,
      );

      // Test 'partial' redaction level
      mockDataMasker.setRedactionLevel('partial');
      mockPIIRedactor.redact.mockReturnValue('Processing payment for card 4111-****-****-1111');

      secureLogger.info('payment:process', sensitiveMessage);

      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        'payment:process',
        'Processing payment for card 4111-****-****-1111',
        undefined,
        undefined,
      );

      // Test 'full' redaction level
      mockDataMasker.setRedactionLevel('full');
      mockPIIRedactor.redact.mockReturnValue('Processing payment for card [CREDIT_CARD_REDACTED]');

      secureLogger.info('payment:process', sensitiveMessage);

      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        'payment:process',
        'Processing payment for card [CREDIT_CARD_REDACTED]',
        undefined,
        undefined,
      );

      // Assert - Verify redaction level changes
      expect(mockDataMasker.setRedactionLevel).toHaveBeenCalledWith('none');
      expect(mockDataMasker.setRedactionLevel).toHaveBeenCalledWith('partial');
      expect(mockDataMasker.setRedactionLevel).toHaveBeenCalledWith('full');
    });

    it('should maintain audit trail of security events', () => {
      // Arrange
      const testData = { userId: 'user123', action: 'login' };
      mockPIIDetector.detectPII.mockReturnValue([]);
      mockPIIDetector.detectPIIInObject.mockReturnValue([]);
      mockDataMasker.isPII.mockReturnValue(false);

      // Act - Generate various security events
      secureLogger.debug('auth:attempt', 'Login attempt', testData);
      secureLogger.info('auth:success', 'Login successful', testData);
      secureLogger.warn('auth:suspicious', 'Suspicious activity detected');
      secureLogger.error('auth:failure', 'Authentication failed');
      secureLogger.setEnabled('auth:debug', false);

      // Assert - Verify audit trail
      const auditLog = secureLogger.getAuditLog();
      expect(auditLog).toHaveLength(5);

      // Verify audit log structure
      auditLog.forEach((entry) => {
        const parsed = JSON.parse(entry);
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('level');
        expect(parsed).toHaveProperty('category');
        expect(parsed).toHaveProperty('containedPII');
        expect(parsed).toHaveProperty('redactionLevel');
      });

      // Verify specific audit entries
      const debugEntry = JSON.parse(auditLog[0]);
      expect(debugEntry.level).toBe('debug');
      expect(debugEntry.category).toBe('auth:attempt');
      expect(debugEntry.containedPII).toBe(false);

      const configEntry = JSON.parse(auditLog[4]);
      expect(configEntry.level).toBe('config');
      expect(configEntry.category).toBe('category_toggle');
      expect(configEntry.metadata).toEqual({ category: 'auth:debug', enabled: false });
    });
  });

  describe('Security Contract Compliance', () => {
    it('should satisfy security logging contracts', () => {
      // Arrange & Assert - Verify contract compliance
      ContractTestHelper.verifyDebugLoggerContract(secureLogger);

      // Verify security-specific contract extensions
      expect(typeof secureLogger.debug).toBe('function');
      expect(typeof secureLogger.info).toBe('function');
      expect(typeof secureLogger.warn).toBe('function');
      expect(typeof secureLogger.error).toBe('function');
      expect(typeof secureLogger.isEnabled).toBe('function');
      expect(typeof secureLogger.setEnabled).toBe('function');

      // Test contract methods don't throw
      expect(() => secureLogger.debug('contract:test', 'Contract validation')).not.toThrow();
      expect(() => secureLogger.setEnabled('contract:test', true)).not.toThrow();
      expect(typeof secureLogger.isEnabled('contract:test')).toBe('boolean');
    });

    it('should integrate with component loggers maintaining security', () => {
      // Arrange - Test integration with component logging
      const componentData = {
        component: 'payment-processor',
        transactionId: 'txn_1234567890',
        merchantKey: 'mk_test_secret_key_abc123',
        customerEmail: 'customer@example.com',
      };

      const componentDetections: PIIDetectionResult[] = [
        {
          type: 'api_key',
          value: 'mk_test_secret_key_abc123',
          confidence: 0.96,
          startIndex: 0,
          endIndex: 26,
        },
        {
          type: 'email',
          value: 'customer@example.com',
          confidence: 0.97,
          startIndex: 0,
          endIndex: 20,
        },
      ];

      mockPIIDetector.detectPII.mockReturnValue([]);
      mockPIIDetector.detectPIIInObject.mockReturnValue(componentDetections);
      mockPIIRedactor.redactObject.mockReturnValue({
        component: 'payment-processor',
        transactionId: 'txn_1234567890',
        merchantKey: '[API_KEY_REDACTED]',
        customerEmail: '[EMAIL_REDACTED]',
      });

      // Act
      secureLogger.info(
        'component:payment',
        'Processing payment transaction',
        componentData,
        'corr-123',
      );

      // Assert - Verify secure component integration
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        'component:payment',
        'Processing payment transaction',
        expect.objectContaining({
          merchantKey: '[API_KEY_REDACTED]',
          customerEmail: '[EMAIL_REDACTED]',
        }),
        'corr-123',
      );

      // Verify audit includes correlation ID context
      const auditLog = secureLogger.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toContain('"containedPII":true');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle PII detection failures gracefully', () => {
      // Arrange - Simulate PII detection failure
      mockPIIDetector.detectPII.mockImplementation(() => {
        throw new Error('PII detection service unavailable');
      });

      mockPIIDetector.detectPIIInObject.mockImplementation(() => {
        throw new Error('PII detection service unavailable');
      });

      // Act & Assert - Should not throw
      expect(() => {
        secureLogger.warn('error:pii', 'Message with potential PII: user@example.com', {
          sensitiveData: 'value',
        });
      }).not.toThrow();

      // Verify fallback behavior
      expect(mockBaseLogger.warn).toHaveBeenCalled();

      // Should still create audit log entry
      const auditLog = secureLogger.getAuditLog();
      expect(auditLog).toHaveLength(1);
    });

    it('should handle redaction failures with safe defaults', () => {
      // Arrange - Simulate redaction failure
      const messageWithPII = 'Contact support at support@company.com for help';
      const emailDetection: PIIDetectionResult = {
        type: 'email',
        value: 'support@company.com',
        confidence: 0.98,
        startIndex: 17,
        endIndex: 37,
      };

      mockPIIDetector.detectPII.mockReturnValue([emailDetection]);
      mockPIIRedactor.redact.mockImplementation(() => {
        throw new Error('Redaction service failure');
      });

      // Act & Assert - Should use safe default
      expect(() => {
        secureLogger.error('error:redaction', messageWithPII);
      }).not.toThrow();

      // Verify safe fallback was used
      expect(mockBaseLogger.error).toHaveBeenCalledWith(
        'error:redaction',
        messageWithPII, // Original message as fallback
        undefined,
        undefined,
      );
    });

    it('should validate PII confidence thresholds', () => {
      // Arrange - Test confidence-based PII handling
      const lowConfidenceDetection: PIIDetectionResult = {
        type: 'phone',
        value: '123-456-7890',
        confidence: 0.45, // Low confidence
        startIndex: 0,
        endIndex: 12,
      };

      const highConfidenceDetection: PIIDetectionResult = {
        type: 'email',
        value: 'test@example.com',
        confidence: 0.98, // High confidence
        startIndex: 0,
        endIndex: 16,
      };

      // Mock different confidence scenarios
      mockPIIDetector.detectPII
        .mockReturnValueOnce([lowConfidenceDetection])
        .mockReturnValueOnce([highConfidenceDetection]);

      mockPIIRedactor.redact
        .mockReturnValueOnce('Contact: 123-456-7890') // Low confidence - no redaction
        .mockReturnValueOnce('Contact: [EMAIL_REDACTED]'); // High confidence - redacted

      // Act
      secureLogger.debug('confidence:low', 'Contact: 123-456-7890');
      secureLogger.debug('confidence:high', 'Contact: test@example.com');

      // Assert - Verify confidence-based processing
      expect(mockBaseLogger.debug).toHaveBeenNthCalledWith(
        1,
        'confidence:low',
        'Contact: 123-456-7890',
        undefined,
        undefined,
      );

      expect(mockBaseLogger.debug).toHaveBeenNthCalledWith(
        2,
        'confidence:high',
        'Contact: [EMAIL_REDACTED]',
        undefined,
        undefined,
      );
    });
  });
});

describe('Comprehensive Security Integration', () => {
  it('should validate complete security pipeline with all components', () => {
    // Arrange - Comprehensive security test
    const mockSuite = LondonSchoolMockFactory.createDebugLoggingMockSuite();
    const mockDataMasker = new MockDataMasker();
    const mockPIIDetector = new MockPIIDetector();
    const mockPIIRedactor = new MockPIIRedactor();

    const secureLogger = new SecureDebugLogger(
      mockDataMasker,
      mockPIIDetector,
      mockPIIRedactor,
      mockSuite.debugLogger,
    );

    // Complex test data with multiple PII types
    const comprehensiveTestData = {
      authentication: {
        userEmail: 'john.doe@company.com',
        sessionToken: 'sess_1a2b3c4d5e6f7g8h9i0j',
        ipAddress: '203.0.113.195',
      },
      payment: {
        cardNumber: '4532-1234-5678-9012',
        expiryDate: '12/25',
        cvv: '123',
        billingAddress: '123 Main St, Anytown, CA 90210',
      },
      profile: {
        ssn: '987-65-4321',
        phoneNumber: '+1-555-987-6543',
        apiKeys: {
          stripe: 'sk_live_abcdef123456789',
          paypal: 'sb_abc123def456',
        },
      },
    };

    const comprehensiveDetections: PIIDetectionResult[] = [
      {
        type: 'email',
        value: 'john.doe@company.com',
        confidence: 0.99,
        startIndex: 0,
        endIndex: 20,
      },
      {
        type: 'token',
        value: 'sess_1a2b3c4d5e6f7g8h9i0j',
        confidence: 0.94,
        startIndex: 0,
        endIndex: 24,
      },
      { type: 'ip_address', value: '203.0.113.195', confidence: 0.91, startIndex: 0, endIndex: 13 },
      {
        type: 'credit_card',
        value: '4532-1234-5678-9012',
        confidence: 0.98,
        startIndex: 0,
        endIndex: 19,
      },
      { type: 'ssn', value: '987-65-4321', confidence: 0.99, startIndex: 0, endIndex: 11 },
      { type: 'phone', value: '+1-555-987-6543', confidence: 0.96, startIndex: 0, endIndex: 15 },
      {
        type: 'api_key',
        value: 'sk_live_abcdef123456789',
        confidence: 0.97,
        startIndex: 0,
        endIndex: 23,
      },
      { type: 'api_key', value: 'sb_abc123def456', confidence: 0.89, startIndex: 0, endIndex: 15 },
    ];

    mockPIIDetector.detectPII.mockReturnValue([]);
    mockPIIDetector.detectPIIInObject.mockReturnValue(comprehensiveDetections);
    mockDataMasker.isPII.mockReturnValue(true);
    mockDataMasker.setRedactionLevel('full');
    mockPIIRedactor.redactObject.mockReturnValue({
      authentication: {
        userEmail: '[EMAIL_REDACTED]',
        sessionToken: '[TOKEN_REDACTED]',
        ipAddress: '[IP_REDACTED]',
      },
      payment: {
        cardNumber: '[CREDIT_CARD_REDACTED]',
        expiryDate: '12/25',
        cvv: '[REDACTED]',
        billingAddress: '[ADDRESS_REDACTED]',
      },
      profile: {
        ssn: '[SSN_REDACTED]',
        phoneNumber: '[PHONE_REDACTED]',
        apiKeys: {
          stripe: '[API_KEY_REDACTED]',
          paypal: '[API_KEY_REDACTED]',
        },
      },
    });

    // Act - Process comprehensive sensitive data
    secureLogger.info(
      'security:comprehensive',
      'Processing user profile update with sensitive data',
      comprehensiveTestData,
      'corr-security-test-123',
    );

    // Assert - Verify complete security pipeline
    expect(mockPIIDetector.detectPIIInObject).toHaveBeenCalledWith(comprehensiveTestData);
    expect(mockPIIRedactor.redactObject).toHaveBeenCalledWith(
      comprehensiveTestData,
      comprehensiveDetections,
    );

    expect(mockSuite.debugLogger.info).toHaveBeenCalledWith(
      'security:comprehensive',
      'Processing user profile update with sensitive data',
      expect.objectContaining({
        authentication: expect.objectContaining({
          userEmail: '[EMAIL_REDACTED]',
          sessionToken: '[TOKEN_REDACTED]',
          ipAddress: '[IP_REDACTED]',
        }),
        payment: expect.objectContaining({
          cardNumber: '[CREDIT_CARD_REDACTED]',
          ssn: undefined, // Should not leak
        }),
        profile: expect.objectContaining({
          ssn: '[SSN_REDACTED]',
          phoneNumber: '[PHONE_REDACTED]',
        }),
      }),
      'corr-security-test-123',
    );

    // Verify comprehensive audit logging
    const auditLog = secureLogger.getAuditLog();
    expect(auditLog).toHaveLength(1);
    const auditEntry = JSON.parse(auditLog[0]);
    expect(auditEntry.containedPII).toBe(true);
    expect(auditEntry.level).toBe('info');
    expect(auditEntry.category).toBe('security:comprehensive');
    expect(auditEntry.redactionLevel).toBe('full');

    // Verify all PII types were handled
    expect(comprehensiveDetections).toHaveLength(8);
    const detectedTypes = comprehensiveDetections.map((d) => d.type);
    expect(detectedTypes).toContain('email');
    expect(detectedTypes).toContain('credit_card');
    expect(detectedTypes).toContain('ssn');
    expect(detectedTypes).toContain('api_key');
  });
});
