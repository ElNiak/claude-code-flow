import { getErrorMessage as _getErrorMessage } from '../utils/error-handler.js';
// Global type definitions and environment compatibility

// Node.js global augmentations,
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      DEBUG?: string;
      CLAUDE_FLOW_HOME?: string;
      [key: string]: string | undefined;
    }
  }
}

// Deno compatibility shims (when running in Node)
declare global {
  var Deno: any | undefined;
  
  interface GlobalThis {
    Deno?: any;
  }
}

// Commander.js types extension,
import type { Command as CommanderCommand } from 'commander';

declare module 'commander' {
  interface Command {
    showHelp(): void;
    globalOption(flags: string, description?: string, defaultValue?: any): Command;
    main(argv?: string[]): Promise<void>;
  }
}



export {};