# Tech Stack

- **Language**: TypeScript/JavaScript (Node.js)
- **Build System**: TypeScript compiler (tsc), tsx for development
- **Package Manager**: npm
- **Testing**: Jest with node modules
- **Module System**: ES modules (type: "module" in package.json)
- **Target**: Node.js 20+, ES2022
- **Key Dependencies**: 
  - @modelcontextprotocol/sdk
  - better-sqlite3 (database)
  - commander (CLI)
  - blessed (terminal UI)
  - express (web server)
  - ruv-swarm (swarm coordination)

**Build Configuration**:
- TypeScript config uses NodeNext module resolution
- Multiple tsconfig files for different targets (cli, cjs)
- Outputs to `dist/` directory