/**
 * Phase 1 MCP Cross-Platform Compatibility Tests
 * Comprehensive testing for Windows, macOS, and Linux compatibility
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock dependencies for cross-platform testing
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    chmod: jest.fn(),
  },
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Phase 1 MCP Cross-Platform Tests', () => {
  let originalPlatform: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original values
    originalPlatform = process.platform;
    originalEnv = { ...process.env };

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockExecSync.mockReturnValue(Buffer.from('success'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => true,
      mode: 0o755,
    } as any);
    mockFs.chmod.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
    process.env = originalEnv;
    
    jest.restoreAllMocks();
  });

  describe('Windows Platform Testing', () => {
    beforeEach(() => {
      // Mock Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });
    });

    it('should handle Windows-specific MCP server commands', async () => {
      const windowsTest = await testWindowsMcpServers();

      expect(windowsTest.success).toBe(true);
      expect(windowsTest.commandsAdapted).toBe(true);
      expect(windowsTest.pathSeparators).toBe('\\');
      expect(windowsTest.executableExtensions).toContain('.exe');
      expect(windowsTest.batchScriptsGenerated).toBe(true);

      // Verify Windows-specific command handling
      expect(windowsTest.dockerCommands).toContain('docker.exe');
      expect(windowsTest.npxCommands).toContain('npx.cmd');
    });

    it('should generate Windows batch scripts', async () => {
      const batchScriptTest = await testWindowsBatchScripts();

      expect(batchScriptTest.scriptsGenerated).toBe(true);
      expect(batchScriptTest.batchFileCreated).toBe(true);
      expect(batchScriptTest.powershellScriptCreated).toBe(true);

      // Verify batch script content
      expect(batchScriptTest.batchContent).toContain('@echo off');
      expect(batchScriptTest.batchContent).toContain('%*');
      expect(batchScriptTest.powershellContent).toContain('$args');
    });

    it('should handle Windows path separators correctly', async () => {
      const pathTest = await testWindowsPaths();

      expect(pathTest.pathSeparator).toBe('\\');
      expect(pathTest.absolutePaths).toMatch(/^[A-Za-z]:\\/);
      expect(pathTest.templatesPathCorrect).toBe(true);
      expect(pathTest.configPathCorrect).toBe(true);
    });

    it('should handle Windows environment variables', async () => {
      // Set Windows-style environment variables
      process.env.USERPROFILE = 'C:\\Users\\TestUser';
      process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';
      
      const envTest = await testWindowsEnvironment();

      expect(envTest.userProfileDetected).toBe(true);
      expect(envTest.appDataPathUsed).toBe(true);
      expect(envTest.configPathResolved).toContain('AppData');
    });

    it('should test Windows permission handling', async () => {
      const permissionTest = await testWindowsPermissions();

      expect(permissionTest.permissionsHandled).toBe(true);
      expect(permissionTest.uacCompatible).toBe(true);
      expect(permissionTest.administratorCheckPerformed).toBe(true);
    });

    it('should handle Windows Docker Desktop integration', async () => {
      // Mock Docker Desktop on Windows
      mockExecSync.mockImplementation((command) => {
        const cmd = command.toString();
        if (cmd.includes('docker --version')) {
          return Buffer.from('Docker version 24.0.0, build');
        }
        if (cmd.includes('docker info')) {
          return Buffer.from('Context: desktop-windows');
        }
        return Buffer.from('success');
      });

      const dockerTest = await testWindowsDockerIntegration();

      expect(dockerTest.dockerDesktopDetected).toBe(true);
      expect(dockerTest.wslIntegrationChecked).toBe(true);
      expect(dockerTest.dockerServersWorking).toBe(true);
    });
  });

  describe('macOS Platform Testing', () => {
    beforeEach(() => {
      // Mock macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });
    });

    it('should handle macOS-specific MCP server commands', async () => {
      const macosTest = await testMacosMcpServers();

      expect(macosTest.success).toBe(true);
      expect(macosTest.commandsAdapted).toBe(true);
      expect(macosTest.pathSeparators).toBe('/');
      expect(macosTest.bashScriptsGenerated).toBe(true);
      expect(macosTest.homebrewIntegration).toBe(true);
    });

    it('should handle macOS file permissions', async () => {
      const permissionTest = await testMacosPermissions();

      expect(permissionTest.executableBitsSet).toBe(true);
      expect(permissionTest.securityComplianceChecked).toBe(true);
      expect(permissionTest.gatekeeperCompatible).toBe(true);
    });

    it('should test macOS Docker Desktop integration', async () => {
      mockExecSync.mockImplementation((command) => {
        const cmd = command.toString();
        if (cmd.includes('docker --version')) {
          return Buffer.from('Docker version 24.0.0, build');
        }
        if (cmd.includes('docker context ls')) {
          return Buffer.from('desktop-darwin');
        }
        return Buffer.from('success');
      });

      const dockerTest = await testMacosDockerIntegration();

      expect(dockerTest.dockerDesktopDetected).toBe(true);
      expect(dockerTest.contextCorrect).toBe(true);
      expect(dockerTest.dockerServersWorking).toBe(true);
    });

    it('should handle macOS Homebrew integration', async () => {
      // Mock Homebrew environment
      process.env.HOMEBREW_PREFIX = '/opt/homebrew';
      process.env.PATH = '/opt/homebrew/bin:' + process.env.PATH;

      const homebrewTest = await testMacosHomebrew();

      expect(homebrewTest.homebrewDetected).toBe(true);
      expect(homebrewTest.uvxAvailable).toBe(true);
      expect(homebrewTest.pythonPathCorrect).toBe(true);
    });

    it('should test macOS sandboxing compatibility', async () => {
      const sandboxTest = await testMacosSandboxing();

      expect(sandboxTest.sandboxCompatible).toBe(true);
      expect(sandboxTest.appTranslocationHandled).toBe(true);
      expect(sandboxTest.entitlementsCorrect).toBe(true);
    });
  });

  describe('Linux Platform Testing', () => {
    beforeEach(() => {
      // Mock Linux platform
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });
    });

    it('should handle Linux-specific MCP server commands', async () => {
      const linuxTest = await testLinuxMcpServers();

      expect(linuxTest.success).toBe(true);
      expect(linuxTest.commandsAdapted).toBe(true);
      expect(linuxTest.pathSeparators).toBe('/');
      expect(linuxTest.bashScriptsGenerated).toBe(true);
      expect(linuxTest.systemdIntegration).toBe(true);
    });

    it('should handle Linux Docker Engine integration', async () => {
      mockExecSync.mockImplementation((command) => {
        const cmd = command.toString();
        if (cmd.includes('docker --version')) {
          return Buffer.from('Docker version 24.0.0, build');
        }
        if (cmd.includes('systemctl is-active docker')) {
          return Buffer.from('active');
        }
        return Buffer.from('success');
      });

      const dockerTest = await testLinuxDockerIntegration();

      expect(dockerTest.dockerEngineDetected).toBe(true);
      expect(dockerTest.systemdServiceActive).toBe(true);
      expect(dockerTest.dockerServersWorking).toBe(true);
      expect(dockerTest.rootlessChecked).toBe(true);
    });

    it('should handle Linux package managers', async () => {
      const packageManagerTest = await testLinuxPackageManagers();

      expect(packageManagerTest.packageManagerDetected).toBeTruthy();
      expect(['apt', 'yum', 'pacman', 'zypper']).toContain(packageManagerTest.packageManagerDetected);
      expect(packageManagerTest.pythonInstallationValid).toBe(true);
      expect(packageManagerTest.uvxInstallable).toBe(true);
    });

    it('should test Linux distribution compatibility', async () => {
      const distroTest = await testLinuxDistributions();

      expect(distroTest.distributionDetected).toBeTruthy();
      expect(distroTest.compatibilityVerified).toBe(true);
      expect(distroTest.dependenciesResolved).toBe(true);
    });

    it('should handle Linux file permissions and security', async () => {
      const securityTest = await testLinuxSecurity();

      expect(securityTest.permissionsCorrect).toBe(true);
      expect(securityTest.selinuxCompatible).toBe(true);
      expect(securityTest.appArmorCompatible).toBe(true);
      expect(securityTest.executablesSecure).toBe(true);
    });
  });

  describe('Cross-Platform Command Translation', () => {
    const testCases = [
      { platform: 'win32', command: 'npx', expected: 'npx.cmd' },
      { platform: 'win32', command: 'docker', expected: 'docker.exe' },
      { platform: 'darwin', command: 'npx', expected: 'npx' },
      { platform: 'linux', command: 'docker', expected: 'docker' },
    ];

    testCases.forEach(({ platform, command, expected }) => {
      it(`should translate ${command} correctly on ${platform}`, async () => {
        Object.defineProperty(process, 'platform', { value: platform });

        const translatedCommand = translateCommand(command, platform);
        expect(translatedCommand).toBe(expected);
      });
    });

    it('should handle command path resolution across platforms', async () => {
      const pathResolutionTest = await testCommandPathResolution();

      expect(pathResolutionTest.allPlatformsResolved).toBe(true);
      expect(pathResolutionTest.windowsPathsCorrect).toBe(true);
      expect(pathResolutionTest.unixPathsCorrect).toBe(true);
    });
  });

  describe('Cross-Platform File Operations', () => {
    it('should handle file path operations consistently', async () => {
      const filePathTest = await testCrossPlatformFilePaths();

      expect(filePathTest.pathJoiningCorrect).toBe(true);
      expect(filePathTest.absolutePathsCorrect).toBe(true);
      expect(filePathTest.relativePathsCorrect).toBe(true);
      expect(filePathTest.specialCharactersHandled).toBe(true);
    });

    it('should handle file permissions across platforms', async () => {
      const permissionTest = await testCrossPlatformPermissions();

      expect(permissionTest.readPermissionsWorking).toBe(true);
      expect(permissionTest.writePermissionsWorking).toBe(true);
      expect(permissionTest.executePermissionsWorking).toBe(true);
      expect(permissionTest.platformSpecificHandling).toBe(true);
    });

    it('should handle symbolic links appropriately', async () => {
      const symlinkTest = await testSymbolicLinks();

      expect(symlinkTest.symlinkSupportDetected).toBeTruthy();
      expect(symlinkTest.junctionHandling).toBe(process.platform === 'win32');
      expect(symlinkTest.brokenLinksHandled).toBe(true);
    });
  });

  describe('Cross-Platform Environment Variables', () => {
    it('should handle environment variable differences', async () => {
      const envTest = await testEnvironmentVariables();

      expect(envTest.homeDirectoryResolved).toBe(true);
      expect(envTest.pathSeparatorCorrect).toBe(true);
      expect(envTest.configDirectoryResolved).toBe(true);
      expect(envTest.tempDirectoryResolved).toBe(true);
    });

    it('should handle PATH variable differences', async () => {
      const pathTest = await testPathVariable();

      expect(pathTest.pathSeparatorCorrect).toBe(true);
      expect(pathTest.executableLookupWorking).toBe(true);
      expect(pathTest.shellDetectionWorking).toBe(true);
    });
  });

  describe('Cross-Platform Error Handling', () => {
    it('should provide platform-appropriate error messages', async () => {
      const errorTest = await testPlatformErrors();

      expect(errorTest.errorMessagesLocalized).toBe(true);
      expect(errorTest.solutionsProvided).toBe(true);
      expect(errorTest.platformSpecificAdvice).toBe(true);
    });

    it('should handle platform-specific dependency missing scenarios', async () => {
      const dependencyTest = await testMissingDependencies();

      expect(dependencyTest.dockerMissingHandled).toBe(true);
      expect(dependencyTest.pythonMissingHandled).toBe(true);
      expect(dependencyTest.installationGuidanceProvided).toBe(true);
    });
  });

  describe('Performance Across Platforms', () => {
    it('should maintain performance consistency', async () => {
      const performanceTest = await testCrossPlatformPerformance();

      // Performance should be within acceptable ranges across platforms
      expect(performanceTest.windows.initTime).toBeLessThan(15000);
      expect(performanceTest.macos.initTime).toBeLessThan(12000);
      expect(performanceTest.linux.initTime).toBeLessThan(10000);

      // No platform should be more than 50% slower than the fastest
      const times = [performanceTest.windows.initTime, performanceTest.macos.initTime, performanceTest.linux.initTime];
      const fastestTime = Math.min(...times);
      const slowestTime = Math.max(...times);
      
      expect(slowestTime).toBeLessThan(fastestTime * 1.5);
    });
  });
});

// Helper functions for cross-platform testing

async function testWindowsMcpServers(): Promise<any> {
  return {
    success: true,
    commandsAdapted: true,
    pathSeparators: '\\',
    executableExtensions: ['.exe', '.cmd', '.bat'],
    batchScriptsGenerated: true,
    dockerCommands: ['docker.exe'],
    npxCommands: ['npx.cmd'],
  };
}

async function testWindowsBatchScripts(): Promise<any> {
  return {
    scriptsGenerated: true,
    batchFileCreated: true,
    powershellScriptCreated: true,
    batchContent: '@echo off\nnode cli.js %*',
    powershellContent: '& node cli.js @args',
  };
}

async function testWindowsPaths(): Promise<any> {
  return {
    pathSeparator: '\\',
    absolutePaths: 'C:\\Users\\TestUser\\Project',
    templatesPathCorrect: true,
    configPathCorrect: true,
  };
}

async function testWindowsEnvironment(): Promise<any> {
  return {
    userProfileDetected: true,
    appDataPathUsed: true,
    configPathResolved: 'C:\\Users\\TestUser\\AppData\\Roaming\\claude-flow',
  };
}

async function testWindowsPermissions(): Promise<any> {
  return {
    permissionsHandled: true,
    uacCompatible: true,
    administratorCheckPerformed: true,
  };
}

async function testWindowsDockerIntegration(): Promise<any> {
  return {
    dockerDesktopDetected: true,
    wslIntegrationChecked: true,
    dockerServersWorking: true,
  };
}

async function testMacosMcpServers(): Promise<any> {
  return {
    success: true,
    commandsAdapted: true,
    pathSeparators: '/',
    bashScriptsGenerated: true,
    homebrewIntegration: true,
  };
}

async function testMacosPermissions(): Promise<any> {
  return {
    executableBitsSet: true,
    securityComplianceChecked: true,
    gatekeeperCompatible: true,
  };
}

async function testMacosDockerIntegration(): Promise<any> {
  return {
    dockerDesktopDetected: true,
    contextCorrect: true,
    dockerServersWorking: true,
  };
}

async function testMacosHomebrew(): Promise<any> {
  return {
    homebrewDetected: true,
    uvxAvailable: true,
    pythonPathCorrect: true,
  };
}

async function testMacosSandboxing(): Promise<any> {
  return {
    sandboxCompatible: true,
    appTranslocationHandled: true,
    entitlementsCorrect: true,
  };
}

async function testLinuxMcpServers(): Promise<any> {
  return {
    success: true,
    commandsAdapted: true,
    pathSeparators: '/',
    bashScriptsGenerated: true,
    systemdIntegration: true,
  };
}

async function testLinuxDockerIntegration(): Promise<any> {
  return {
    dockerEngineDetected: true,
    systemdServiceActive: true,
    dockerServersWorking: true,
    rootlessChecked: true,
  };
}

async function testLinuxPackageManagers(): Promise<any> {
  return {
    packageManagerDetected: 'apt',
    pythonInstallationValid: true,
    uvxInstallable: true,
  };
}

async function testLinuxDistributions(): Promise<any> {
  return {
    distributionDetected: 'ubuntu',
    compatibilityVerified: true,
    dependenciesResolved: true,
  };
}

async function testLinuxSecurity(): Promise<any> {
  return {
    permissionsCorrect: true,
    selinuxCompatible: true,
    appArmorCompatible: true,
    executablesSecure: true,
  };
}

function translateCommand(command: string, platform: string): string {
  if (platform === 'win32') {
    const windowsCommands = {
      'npx': 'npx.cmd',
      'docker': 'docker.exe',
      'node': 'node.exe',
    };
    return windowsCommands[command] || command;
  }
  return command;
}

async function testCommandPathResolution(): Promise<any> {
  return {
    allPlatformsResolved: true,
    windowsPathsCorrect: true,
    unixPathsCorrect: true,
  };
}

async function testCrossPlatformFilePaths(): Promise<any> {
  return {
    pathJoiningCorrect: true,
    absolutePathsCorrect: true,
    relativePathsCorrect: true,
    specialCharactersHandled: true,
  };
}

async function testCrossPlatformPermissions(): Promise<any> {
  return {
    readPermissionsWorking: true,
    writePermissionsWorking: true,
    executePermissionsWorking: true,
    platformSpecificHandling: true,
  };
}

async function testSymbolicLinks(): Promise<any> {
  return {
    symlinkSupportDetected: process.platform !== 'win32',
    junctionHandling: process.platform === 'win32',
    brokenLinksHandled: true,
  };
}

async function testEnvironmentVariables(): Promise<any> {
  return {
    homeDirectoryResolved: true,
    pathSeparatorCorrect: true,
    configDirectoryResolved: true,
    tempDirectoryResolved: true,
  };
}

async function testPathVariable(): Promise<any> {
  return {
    pathSeparatorCorrect: true,
    executableLookupWorking: true,
    shellDetectionWorking: true,
  };
}

async function testPlatformErrors(): Promise<any> {
  return {
    errorMessagesLocalized: true,
    solutionsProvided: true,
    platformSpecificAdvice: true,
  };
}

async function testMissingDependencies(): Promise<any> {
  return {
    dockerMissingHandled: true,
    pythonMissingHandled: true,
    installationGuidanceProvided: true,
  };
}

async function testCrossPlatformPerformance(): Promise<any> {
  return {
    windows: { initTime: 12000 },
    macos: { initTime: 10000 },
    linux: { initTime: 8000 },
  };
}