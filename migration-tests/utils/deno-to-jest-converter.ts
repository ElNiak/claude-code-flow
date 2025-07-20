/**
 * Deno to Jest Test Converter
 * Converts Deno test files to Jest-compatible format
 */

export interface ConversionOptions {
  preserveComments?: boolean;
  useESModules?: boolean;
  maintainStructure?: boolean;
  addTypeScript?: boolean;
  targetJestVersion?: string;
}

export interface ConversionResult {
  convertedCode: string;
  warnings: string[];
  errors: string[];
  conversionStats: {
    testsConverted: number;
    assertionsConverted: number;
    importsUpdated: number;
    blocksRestructured: number;
  };
}

export class DenoToJestConverter {
  private options: ConversionOptions;

  constructor(options: ConversionOptions = {}) {
    this.options = {
      preserveComments: true,
      useESModules: true,
      maintainStructure: true,
      addTypeScript: true,
      targetJestVersion: '29.x',
      ...options
    };
  }

  /**
   * Convert Deno test code to Jest format
   */
  public convert(denoCode: string): ConversionResult {
    const result: ConversionResult = {
      convertedCode: '',
      warnings: [],
      errors: [],
      conversionStats: {
        testsConverted: 0,
        assertionsConverted: 0,
        importsUpdated: 0,
        blocksRestructured: 0
      }
    };

    try {
      let convertedCode = denoCode;

      // Step 1: Convert imports
      convertedCode = this.convertImports(convertedCode, result);

      // Step 2: Convert test structure
      convertedCode = this.convertTestStructure(convertedCode, result);

      // Step 3: Convert assertions
      convertedCode = this.convertAssertions(convertedCode, result);

      // Step 4: Convert async patterns
      convertedCode = this.convertAsyncPatterns(convertedCode, result);

      // Step 5: Add Jest setup if needed
      convertedCode = this.addJestSetup(convertedCode, result);

      // Step 6: Clean up and format
      convertedCode = this.cleanupAndFormat(convertedCode, result);

      result.convertedCode = convertedCode;
    } catch (error) {
      result.errors.push(`Conversion failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Convert Deno imports to Jest/Node.js imports
   */
  private convertImports(code: string, result: ConversionResult): string {
    let convertedCode = code;

    // Convert Deno std library imports
    const stdImportPattern = /import\s+{([^}]+)}\s+from\s+["']https:\/\/deno\.land\/std[@\/][^"']+["']/g;
    convertedCode = convertedCode.replace(stdImportPattern, (match, imports) => {
      result.conversionStats.importsUpdated++;

      // Map common std imports to Jest equivalents
      if (imports.includes('assertEquals') || imports.includes('assert')) {
        return `// Jest assertions are available globally`;
      }

      if (imports.includes('path')) {
        return `import path from 'path';`;
      }

      if (imports.includes('fs')) {
        return `import fs from 'fs/promises';`;
      }

      result.warnings.push(`Unmapped std import: ${match}`);
      return `// TODO: Map import - ${match}`;
    });

    // Convert testing imports
    const testImportPattern = /import\s+{([^}]+)}\s+from\s+["']https:\/\/deno\.land\/std\/testing\/[^"']+["']/g;
    convertedCode = convertedCode.replace(testImportPattern, (match, imports) => {
      result.conversionStats.importsUpdated++;
      return `// Jest testing utilities are available globally`;
    });

    // Convert relative imports to include file extensions if needed
    if (this.options.useESModules) {
      const relativeImportPattern = /import\s+([^"']+)\s+from\s+["'](\.[^"']+)["']/g;
      convertedCode = convertedCode.replace(relativeImportPattern, (match, importClause, path) => {
        if (!path.endsWith('.js') && !path.endsWith('.ts')) {
          result.conversionStats.importsUpdated++;
          return `import ${importClause} from '${path}.js'`;
        }
        return match;
      });
    }

    return convertedCode;
  }

  /**
   * Convert Deno.test structure to Jest describe/it blocks
   */
  private convertTestStructure(code: string, result: ConversionResult): string {
    let convertedCode = code;
    const testBlocks: Array<{ original: string; converted: string; indent: string }> = [];

    // Extract all Deno.test blocks
    const denoTestPattern = /^(\s*)Deno\.test\(\s*{?\s*name:\s*["']([^"']+)["']\s*,?\s*fn:\s*(async\s+)?(\([^)]*\)\s*=>\s*{[\s\S]*?})\s*}?\s*\);?\s*$/gm;

    convertedCode = convertedCode.replace(denoTestPattern, (match, indent, testName, asyncKeyword, testFn) => {
      result.conversionStats.testsConverted++;

      const isAsync = asyncKeyword || testFn.includes('await');
      const asyncPrefix = isAsync ? 'async ' : '';

      const converted = `${indent}describe('${testName}', () => {\n${indent}  it('should pass', ${asyncPrefix}() => {\n${indent}    // Test implementation\n${indent}    ${testFn.replace(/^\([^)]*\)\s*=>\s*{/, '').replace(/}$/, '')}\n${indent}  });\n${indent}});`;

      testBlocks.push({ original: match, converted, indent });
      return converted;
    });

    // Handle simple Deno.test format
    const simpleTestPattern = /^(\s*)Deno\.test\(\s*["']([^"']+)["']\s*,\s*(async\s+)?(\([^)]*\)\s*=>\s*{[\s\S]*?})\s*\);?\s*$/gm;

    convertedCode = convertedCode.replace(simpleTestPattern, (match, indent, testName, asyncKeyword, testFn) => {
      result.conversionStats.testsConverted++;

      const isAsync = asyncKeyword || testFn.includes('await');
      const asyncPrefix = isAsync ? 'async ' : '';

      const testBody = testFn.replace(/^\([^)]*\)\s*=>\s*{/, '').replace(/}$/, '');

      result.conversionStats.blocksRestructured++;
      return `${indent}describe('${testName}', () => {\n${indent}  it('should pass', ${asyncPrefix}() => {\n${indent}    ${testBody}\n${indent}  });\n${indent}});`;
    });

    return convertedCode;
  }

  /**
   * Convert Deno assertions to Jest expect statements
   */
  private convertAssertions(code: string, result: ConversionResult): string {
    let convertedCode = code;

    const assertionMappings = [
      { pattern: /assertEquals\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBe($2)' },
      { pattern: /assertStrictEquals\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toStrictEqual($2)' },
      { pattern: /assertNotEquals\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).not.toBe($2)' },
      { pattern: /assertExists\(\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeDefined(); expect($1).not.toBeNull()' },
      { pattern: /assertNotExists\(\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeUndefined()' },
      { pattern: /assertThrows\(\s*([^,]+)\s*(?:,\s*[^,)]+)?\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toThrow()' },
      { pattern: /assertThrowsAsync\(\s*([^,]+)\s*(?:,\s*[^,)]+)?\s*(?:,\s*[^)]+)?\)/g, replacement: 'await expect($1).rejects.toThrow()' },
      { pattern: /assertArrayIncludes\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: '$2.forEach(item => expect($1).toContain(item))' },
      { pattern: /assertStringIncludes\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toContain($2)' },
      { pattern: /assertMatch\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toMatch($2)' },
      { pattern: /assertInstanceOf\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeInstanceOf($2)' },
      { pattern: /assert\(\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeTruthy()' },
      { pattern: /assertFalse\(\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeFalsy()' },
      { pattern: /assertGreater\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeGreaterThan($2)' },
      { pattern: /assertLess\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeLessThan($2)' },
      { pattern: /assertGreaterOrEqual\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeGreaterThanOrEqual($2)' },
      { pattern: /assertLessOrEqual\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeLessThanOrEqual($2)' },
      { pattern: /assertAlmostEquals\(\s*([^,]+),\s*([^,)]+)\s*(?:,\s*[^,)]+)?\s*(?:,\s*[^)]+)?\)/g, replacement: 'expect($1).toBeCloseTo($2)' }
    ];

    assertionMappings.forEach(({ pattern, replacement }) => {
      const matches = convertedCode.match(pattern);
      if (matches) {
        result.conversionStats.assertionsConverted += matches.length;
      }
      convertedCode = convertedCode.replace(pattern, replacement);
    });

    return convertedCode;
  }

  /**
   * Convert async patterns and await usage
   */
  private convertAsyncPatterns(code: string, result: ConversionResult): string {
    let convertedCode = code;

    // Ensure async test functions are properly handled
    const asyncTestPattern = /it\(\s*['"][^'"]*['"],\s*\(\s*\)\s*=>\s*{/g;
    convertedCode = convertedCode.replace(asyncTestPattern, (match) => {
      if (convertedCode.substring(convertedCode.indexOf(match)).includes('await')) {
        return match.replace('() => {', 'async () => {');
      }
      return match;
    });

    return convertedCode;
  }

  /**
   * Add Jest setup and configuration
   */
  private addJestSetup(code: string, result: ConversionResult): string {
    let convertedCode = code;

    // Add Jest imports if needed
    if (this.options.useESModules && !convertedCode.includes('import')) {
      const jestImports = `/**
 * Jest Test Suite
 * Converted from Deno test format
 */

`;
      convertedCode = jestImports + convertedCode;
    }

    // Add test timeout for async tests
    if (convertedCode.includes('async') && convertedCode.includes('await')) {
      const timeoutSetup = `
// Increase timeout for async operations
jest.setTimeout(30000);

`;
      convertedCode = convertedCode.replace(/describe\(/m, timeoutSetup + 'describe(');
    }

    return convertedCode;
  }

  /**
   * Clean up and format the converted code
   */
  private cleanupAndFormat(code: string, result: ConversionResult): string {
    let convertedCode = code;

    // Remove extra whitespace
    convertedCode = convertedCode.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Ensure proper indentation
    const lines = convertedCode.split('\n');
    let indentLevel = 0;
    const formattedLines = lines.map(line => {
      const trimmedLine = line.trim();

      if (trimmedLine.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const formattedLine = '  '.repeat(indentLevel) + trimmedLine;

      if (trimmedLine.includes('{') && !trimmedLine.includes('}')) {
        indentLevel++;
      }

      return formattedLine;
    });

    convertedCode = formattedLines.join('\n');

    return convertedCode;
  }

  /**
   * Generate conversion report
   */
  public generateReport(result: ConversionResult): string {
    const { conversionStats, warnings, errors } = result;

    return `
# Deno to Jest Conversion Report

## Conversion Statistics
- Tests converted: ${conversionStats.testsConverted}
- Assertions converted: ${conversionStats.assertionsConverted}
- Imports updated: ${conversionStats.importsUpdated}
- Blocks restructured: ${conversionStats.blocksRestructured}

## Warnings (${warnings.length})
${warnings.map(w => `- ${w}`).join('\n')}

## Errors (${errors.length})
${errors.map(e => `- ${e}`).join('\n')}

## Conversion Success Rate
${errors.length === 0 ? '✅ Conversion completed successfully' : '❌ Conversion completed with errors'}
`;
  }
}

/**
 * Utility function to convert a single Deno test file
 */
export function convertDenoTestFile(
  denoCode: string,
  options?: ConversionOptions
): ConversionResult {
  const converter = new DenoToJestConverter(options);
  return converter.convert(denoCode);
}

/**
 * Utility function to validate converted Jest code
 */
export function validateJestCode(jestCode: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for required Jest structure
  if (!jestCode.includes('describe(') && !jestCode.includes('it(') && !jestCode.includes('test(')) {
    issues.push('Missing Jest test structure (describe/it/test)');
  }

  // Check for expect statements
  if (!jestCode.includes('expect(')) {
    issues.push('Missing Jest expect assertions');
  }

  // Check for common syntax issues
  if (jestCode.includes('assertEquals') || jestCode.includes('assertExists')) {
    issues.push('Contains unconverted Deno assertions');
  }

  // Check for async/await consistency
  const hasAwait = jestCode.includes('await');
  const hasAsync = jestCode.includes('async');
  if (hasAwait && !hasAsync) {
    issues.push('Contains await without async function declaration');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
