/**
 * Version utility - Reads version from package.json with PKG compatibility
 */

import fs from 'fs';
import path from 'path';

let cachedVersion: string | null = null;

/**
 * Get version from package.json with PKG-compatible fallback
 * Uses caching to avoid repeated file reads
 */
export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  try {
    // Try multiple possible locations for package.json
    const possiblePaths = [
      path.join(__dirname, '../../package.json'),
      path.join(__dirname, '../../../package.json'),
      path.join(process.cwd(), 'package.json'),
    ];

    for (const packagePath of possiblePaths) {
      try {
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          if (packageJson.version && typeof packageJson.version === 'string') {
            const version = packageJson.version;
            cachedVersion = version;
            return version;
          }
        }
      } catch {
        continue;
      }
    }

    // Fallback version if package.json cannot be read
    const fallbackVersion = '2.0.0-alpha.79';
    cachedVersion = fallbackVersion;
    return fallbackVersion;
  } catch {
    const fallbackVersion = '2.0.0-alpha.79';
    cachedVersion = fallbackVersion;
    return fallbackVersion;
  }
}

// Default export for convenience
export default getVersion;
