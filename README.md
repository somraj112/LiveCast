# LiveCast

A monorepo streaming platform with shared packages and multiple applications.

## Structure

- **apps/**: Application workspaces
  - `web/`: Frontend application (React/Next.js)
  - `server/`: Backend application (Node.js/Express)
- **packages/**: Shared packages
  - `ui/`: Reusable UI components
  - `config/`: Shared ESLint, Prettier, TypeScript configs
  - `types/`: Shared TypeScript type definitions
  - `utils/`: Common utility functions
- **docs/**: Project documentation
- **scripts/**: Automation and deployment scripts

## Getting Started

```bash
# Install dependencies
npm ci

# Build the web application
npm run build

# Start development
npm run dev
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Running and deploying LiveCast

Use Node 24 LTS (`nvm install && nvm use`) and install from the repository root with `npm ci`.
See [production operations](docs/operations/PRODUCTION.md) for PostgreSQL/Redis setup, CI,
staging deployment, migration releases, monitoring, and recovery exercises.
