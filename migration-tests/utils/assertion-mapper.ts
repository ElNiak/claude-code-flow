/**
 * Assertion Mapper for Deno to Jest Migration
 * Maps Deno testing assertions to Jest equivalents
 */

export interface AssertionMapping {
  denoAssertion: string;
  jestEquivalent: string;
  description: string;
  parameters: string[];
  examples: {
    deno: string;
    jest: string;
  };
  notes?: string;
}

export const ASSERTION_MAPPINGS: AssertionMapping[] = [
  {
    denoAssertion: 'assertEquals',
    jestEquivalent: 'expect().toBe()',
    description: 'Asserts that actual equals expected using ===',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertEquals(actual, expected)',
      jest: 'expect(actual).toBe(expected)'
    }
  },
  {
    denoAssertion: 'assertStrictEquals',
    jestEquivalent: 'expect().toStrictEqual()',
    description: 'Asserts deep equality with strict type checking',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertStrictEquals(obj1, obj2)',
      jest: 'expect(obj1).toStrictEqual(obj2)'
    }
  },
  {
    denoAssertion: 'assertNotEquals',
    jestEquivalent: 'expect().not.toBe()',
    description: 'Asserts that actual does not equal expected',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertNotEquals(actual, unexpected)',
      jest: 'expect(actual).not.toBe(unexpected)'
    }
  },
  {
    denoAssertion: 'assertExists',
    jestEquivalent: 'expect().toBeDefined() + expect().not.toBeNull()',
    description: 'Asserts that value is not null or undefined',
    parameters: ['value', 'message?'],
    examples: {
      deno: 'assertExists(value)',
      jest: 'expect(value).toBeDefined(); expect(value).not.toBeNull()'
    }
  },
  {
    denoAssertion: 'assertNotExists',
    jestEquivalent: 'expect().toBeUndefined()',
    description: 'Asserts that value is null or undefined',
    parameters: ['value', 'message?'],
    examples: {
      deno: 'assertNotExists(value)',
      jest: 'expect(value).toBeUndefined()'
    },
    notes: 'Can also use expect().toBeNull() depending on context'
  },
  {
    denoAssertion: 'assert',
    jestEquivalent: 'expect().toBeTruthy()',
    description: 'Asserts that value is truthy',
    parameters: ['value', 'message?'],
    examples: {
      deno: 'assert(condition)',
      jest: 'expect(condition).toBeTruthy()'
    }
  },
  {
    denoAssertion: 'assertFalse',
    jestEquivalent: 'expect().toBeFalsy()',
    description: 'Asserts that value is falsy',
    parameters: ['value', 'message?'],
    examples: {
      deno: 'assertFalse(condition)',
      jest: 'expect(condition).toBeFalsy()'
    }
  },
  {
    denoAssertion: 'assertThrows',
    jestEquivalent: 'expect().toThrow()',
    description: 'Asserts that function throws an error',
    parameters: ['fn', 'ErrorType?', 'message?'],
    examples: {
      deno: 'assertThrows(() => { throw new Error(); })',
      jest: 'expect(() => { throw new Error(); }).toThrow()'
    }
  },
  {
    denoAssertion: 'assertThrowsAsync',
    jestEquivalent: 'expect().rejects.toThrow()',
    description: 'Asserts that async function throws an error',
    parameters: ['fn', 'ErrorType?', 'message?'],
    examples: {
      deno: 'await assertThrowsAsync(async () => { throw new Error(); })',
      jest: 'await expect(async () => { throw new Error(); }).rejects.toThrow()'
    }
  },
  {
    denoAssertion: 'assertArrayIncludes',
    jestEquivalent: 'forEach + expect().toContain()',
    description: 'Asserts that array contains all expected elements',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertArrayIncludes([1, 2, 3], [1, 3])',
      jest: '[1, 3].forEach(item => expect([1, 2, 3]).toContain(item))'
    }
  },
  {
    denoAssertion: 'assertStringIncludes',
    jestEquivalent: 'expect().toContain()',
    description: 'Asserts that string contains substring',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertStringIncludes("hello world", "world")',
      jest: 'expect("hello world").toContain("world")'
    }
  },
  {
    denoAssertion: 'assertMatch',
    jestEquivalent: 'expect().toMatch()',
    description: 'Asserts that string matches regex pattern',
    parameters: ['actual', 'pattern', 'message?'],
    examples: {
      deno: 'assertMatch("hello", /^h/)',
      jest: 'expect("hello").toMatch(/^h/)'
    }
  },
  {
    denoAssertion: 'assertInstanceOf',
    jestEquivalent: 'expect().toBeInstanceOf()',
    description: 'Asserts that value is instance of constructor',
    parameters: ['actual', 'Type', 'message?'],
    examples: {
      deno: 'assertInstanceOf(obj, MyClass)',
      jest: 'expect(obj).toBeInstanceOf(MyClass)'
    }
  },
  {
    denoAssertion: 'assertGreater',
    jestEquivalent: 'expect().toBeGreaterThan()',
    description: 'Asserts that actual is greater than expected',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertGreater(5, 3)',
      jest: 'expect(5).toBeGreaterThan(3)'
    }
  },
  {
    denoAssertion: 'assertLess',
    jestEquivalent: 'expect().toBeLessThan()',
    description: 'Asserts that actual is less than expected',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertLess(3, 5)',
      jest: 'expect(3).toBeLessThan(5)'
    }
  },
  {
    denoAssertion: 'assertGreaterOrEqual',
    jestEquivalent: 'expect().toBeGreaterThanOrEqual()',
    description: 'Asserts that actual is greater than or equal to expected',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertGreaterOrEqual(5, 5)',
      jest: 'expect(5).toBeGreaterThanOrEqual(5)'
    }
  },
  {
    denoAssertion: 'assertLessOrEqual',
    jestEquivalent: 'expect().toBeLessThanOrEqual()',
    description: 'Asserts that actual is less than or equal to expected',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertLessOrEqual(3, 5)',
      jest: 'expect(3).toBeLessThanOrEqual(5)'
    }
  },
  {
    denoAssertion: 'assertAlmostEquals',
    jestEquivalent: 'expect().toBeCloseTo()',
    description: 'Asserts that numbers are approximately equal',
    parameters: ['actual', 'expected', 'tolerance?', 'message?'],
    examples: {
      deno: 'assertAlmostEquals(0.1 + 0.2, 0.3, 0.001)',
      jest: 'expect(0.1 + 0.2).toBeCloseTo(0.3, 3)'
    },
    notes: 'Jest uses precision (number of decimal places) instead of tolerance'
  },
  {
    denoAssertion: 'assertObjectMatch',
    jestEquivalent: 'expect().toMatchObject()',
    description: 'Asserts that object contains expected properties',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertObjectMatch(obj, { prop: "value" })',
      jest: 'expect(obj).toMatchObject({ prop: "value" })'
    }
  },
  {
    denoAssertion: 'assertNotMatch',
    jestEquivalent: 'expect().not.toMatch()',
    description: 'Asserts that string does not match regex pattern',
    parameters: ['actual', 'pattern', 'message?'],
    examples: {
      deno: 'assertNotMatch("hello", /^w/)',
      jest: 'expect("hello").not.toMatch(/^w/)'
    }
  },
  {
    denoAssertion: 'assertNotInstanceOf',
    jestEquivalent: 'expect().not.toBeInstanceOf()',
    description: 'Asserts that value is not instance of constructor',
    parameters: ['actual', 'Type', 'message?'],
    examples: {
      deno: 'assertNotInstanceOf(obj, WrongClass)',
      jest: 'expect(obj).not.toBeInstanceOf(WrongClass)'
    }
  },
  {
    denoAssertion: 'assertNotStrictEquals',
    jestEquivalent: 'expect().not.toStrictEqual()',
    description: 'Asserts deep inequality with strict type checking',
    parameters: ['actual', 'expected', 'message?'],
    examples: {
      deno: 'assertNotStrictEquals(obj1, obj2)',
      jest: 'expect(obj1).not.toStrictEqual(obj2)'
    }
  }
];

/**
 * Assertion Mapper class for converting Deno assertions to Jest
 */
export class AssertionMapper {
  private mappings: Map<string, AssertionMapping>;

  constructor() {
    this.mappings = new Map();
    ASSERTION_MAPPINGS.forEach(mapping => {
      this.mappings.set(mapping.denoAssertion, mapping);
    });
  }

  /**
   * Get Jest equivalent for a Deno assertion
   */
  getJestEquivalent(denoAssertion: string): string | null {
    const mapping = this.mappings.get(denoAssertion);
    return mapping ? mapping.jestEquivalent : null;
  }

  /**
   * Get full mapping information for a Deno assertion
   */
  getMapping(denoAssertion: string): AssertionMapping | null {
    return this.mappings.get(denoAssertion) || null;
  }

  /**
   * Convert a single assertion call from Deno to Jest format
   */
  convertAssertion(assertionCall: string): string {
    // Extract assertion name and parameters
    const match = assertionCall.match(/(\w+)\s*\((.*)\)/);
    if (!match) return assertionCall;

    const [, assertionName, params] = match;
    const mapping = this.getMapping(assertionName);

    if (!mapping) {
      return assertionCall; // Return unchanged if no mapping found
    }

    // Parse parameters
    const paramList = this.parseParameters(params);

    // Convert based on specific assertion type
    return this.convertSpecificAssertion(assertionName, paramList, mapping);
  }

  /**
   * Convert specific assertion types with their unique logic
   */
  private convertSpecificAssertion(
    assertionName: string,
    params: string[],
    mapping: AssertionMapping
  ): string {
    switch (assertionName) {
      case 'assertEquals':
      case 'assertStrictEquals':
      case 'assertNotEquals':
      case 'assertNotStrictEquals':
        return this.convertEqualityAssertion(assertionName, params);

      case 'assertExists':
        return `expect(${params[0]}).toBeDefined(); expect(${params[0]}).not.toBeNull()`;

      case 'assertNotExists':
        return `expect(${params[0]}).toBeUndefined()`;

      case 'assert':
        return `expect(${params[0]}).toBeTruthy()`;

      case 'assertFalse':
        return `expect(${params[0]}).toBeFalsy()`;

      case 'assertThrows':
        return this.convertThrowsAssertion(params, false);

      case 'assertThrowsAsync':
        return this.convertThrowsAssertion(params, true);

      case 'assertArrayIncludes':
        return this.convertArrayIncludesAssertion(params);

      case 'assertStringIncludes':
        return `expect(${params[0]}).toContain(${params[1]})`;

      case 'assertMatch':
      case 'assertNotMatch':
        return this.convertMatchAssertion(assertionName, params);

      case 'assertInstanceOf':
      case 'assertNotInstanceOf':
        return this.convertInstanceOfAssertion(assertionName, params);

      case 'assertGreater':
        return `expect(${params[0]}).toBeGreaterThan(${params[1]})`;

      case 'assertLess':
        return `expect(${params[0]}).toBeLessThan(${params[1]})`;

      case 'assertGreaterOrEqual':
        return `expect(${params[0]}).toBeGreaterThanOrEqual(${params[1]})`;

      case 'assertLessOrEqual':
        return `expect(${params[0]}).toBeLessThanOrEqual(${params[1]})`;

      case 'assertAlmostEquals':
        return this.convertAlmostEqualsAssertion(params);

      case 'assertObjectMatch':
        return `expect(${params[0]}).toMatchObject(${params[1]})`;

      default:
        return `expect(${params[0]}).toBe(${params[1] || 'true'})`;
    }
  }

  /**
   * Convert equality assertions
   */
  private convertEqualityAssertion(assertionName: string, params: string[]): string {
    const [actual, expected] = params;

    switch (assertionName) {
      case 'assertEquals':
        return `expect(${actual}).toBe(${expected})`;
      case 'assertStrictEquals':
        return `expect(${actual}).toStrictEqual(${expected})`;
      case 'assertNotEquals':
        return `expect(${actual}).not.toBe(${expected})`;
      case 'assertNotStrictEquals':
        return `expect(${actual}).not.toStrictEqual(${expected})`;
      default:
        return `expect(${actual}).toBe(${expected})`;
    }
  }

  /**
   * Convert throws assertions
   */
  private convertThrowsAssertion(params: string[], isAsync: boolean): string {
    const [fn, errorType] = params;
    const asyncPrefix = isAsync ? 'await ' : '';
    const rejectsInfix = isAsync ? '.rejects' : '';

    if (errorType && errorType !== 'undefined') {
      return `${asyncPrefix}expect(${fn})${rejectsInfix}.toThrow(${errorType})`;
    } else {
      return `${asyncPrefix}expect(${fn})${rejectsInfix}.toThrow()`;
    }
  }

  /**
   * Convert array includes assertion
   */
  private convertArrayIncludesAssertion(params: string[]): string {
    const [actual, expected] = params;
    return `${expected}.forEach(item => expect(${actual}).toContain(item))`;
  }

  /**
   * Convert match assertions
   */
  private convertMatchAssertion(assertionName: string, params: string[]): string {
    const [actual, pattern] = params;
    const notPrefix = assertionName === 'assertNotMatch' ? '.not' : '';
    return `expect(${actual})${notPrefix}.toMatch(${pattern})`;
  }

  /**
   * Convert instanceof assertions
   */
  private convertInstanceOfAssertion(assertionName: string, params: string[]): string {
    const [actual, type] = params;
    const notPrefix = assertionName === 'assertNotInstanceOf' ? '.not' : '';
    return `expect(${actual})${notPrefix}.toBeInstanceOf(${type})`;
  }

  /**
   * Convert almost equals assertion
   */
  private convertAlmostEqualsAssertion(params: string[]): string {
    const [actual, expected, tolerance] = params;

    if (tolerance) {
      // Convert tolerance to precision (number of decimal places)
      const precision = Math.abs(Math.log10(parseFloat(tolerance) || 0.001));
      return `expect(${actual}).toBeCloseTo(${expected}, ${Math.round(precision)})`;
    } else {
      return `expect(${actual}).toBeCloseTo(${expected})`;
    }
  }

  /**
   * Parse function parameters while respecting nested parentheses and quotes
   */
  private parseParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      const prevChar = i > 0 ? paramString[i - 1] : '';

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      }

      if (!inQuotes) {
        if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}') {
          depth--;
        } else if (char === ',' && depth === 0) {
          params.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * Get all available mappings
   */
  getAllMappings(): AssertionMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Check if a Deno assertion has a Jest equivalent
   */
  hasMapping(denoAssertion: string): boolean {
    return this.mappings.has(denoAssertion);
  }

  /**
   * Generate conversion guide for all mappings
   */
  generateConversionGuide(): string {
    let guide = '# Deno to Jest Assertion Conversion Guide\n\n';

    const categories = {
      'Equality': ['assertEquals', 'assertStrictEquals', 'assertNotEquals', 'assertNotStrictEquals'],
      'Existence': ['assertExists', 'assertNotExists', 'assert', 'assertFalse'],
      'Errors': ['assertThrows', 'assertThrowsAsync'],
      'Arrays & Strings': ['assertArrayIncludes', 'assertStringIncludes'],
      'Pattern Matching': ['assertMatch', 'assertNotMatch'],
      'Type Checking': ['assertInstanceOf', 'assertNotInstanceOf'],
      'Numeric': ['assertGreater', 'assertLess', 'assertGreaterOrEqual', 'assertLessOrEqual', 'assertAlmostEquals'],
      'Objects': ['assertObjectMatch']
    };

    Object.entries(categories).forEach(([category, assertions]) => {
      guide += `## ${category}\n\n`;

      assertions.forEach(assertion => {
        const mapping = this.getMapping(assertion);
        if (mapping) {
          guide += `### ${assertion}\n`;
          guide += `**Description:** ${mapping.description}\n\n`;
          guide += `**Deno:**\n\`\`\`typescript\n${mapping.examples.deno}\n\`\`\`\n\n`;
          guide += `**Jest:**\n\`\`\`typescript\n${mapping.examples.jest}\n\`\`\`\n\n`;
          if (mapping.notes) {
            guide += `**Notes:** ${mapping.notes}\n\n`;
          }
          guide += '---\n\n';
        }
      });
    });

    return guide;
  }
}

// Export singleton instance
export const assertionMapper = new AssertionMapper();

// Export utility functions
export function convertDenoAssertion(assertionCall: string): string {
  return assertionMapper.convertAssertion(assertionCall);
}

export function hasJestEquivalent(denoAssertion: string): boolean {
  return assertionMapper.hasMapping(denoAssertion);
}

export function getJestEquivalent(denoAssertion: string): string | null {
  return assertionMapper.getJestEquivalent(denoAssertion);
}
