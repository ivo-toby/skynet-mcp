# Skynet-MCP

An MCP (Model Context Protocol) Server that acts as an agent and can spawn more Agents using MCP - MCP Inception!

## Features

- TypeScript-based MCP server implementation
- Support for multiple transport layers (SSE, STDIO)
- Agent lifecycle management and orchestration
- Integration with Mastra.ai for dynamic workflows
- Memory and persistence capabilities
- Comprehensive LLM integration via Vercel AI SDK

## Prerequisites

- Node.js >= 20.x
- Docker (optional, for containerized deployment)
- Git

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ivo-toby/skynet-mcp.git
cd skynet-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment configuration:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

## Development

### Available Scripts

- `npm run build` - Build the project
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:docker` - Run Docker-specific tests
- `npm run checktypes` - Type-check the codebase
- `npm run lint` - Lint the codebase
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code using Prettier
- `npm run dev` - Run TypeScript in watch mode
- `npm start` - Start the server
- `npm run inspect` - Run with inspector
- `npm run inspect-watch` - Run inspector in watch mode

### Docker Support

- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start containers with docker-compose
- `npm run docker:down` - Stop containers
- `npm run docker:test` - Run tests in Docker environment

## Project Structure

```
skynet-mcp/
├── src/              # Source code
├── test/             # Test files
├── docs/             # Documentation
├── scripts/          # Utility scripts
├── bin/              # CLI executables
└── dist/             # Compiled output
```

## Configuration

The project uses multiple configuration sources:

1. Environment variables (`.env`)
2. MCP server configuration (`mcp-servers.json`)
3. MCP client configuration (`mcp-clients.json`)

See `.env.example` for available environment variables.

## Testing

The project uses Vitest for testing. Tests are located in the `test/` directory:

- Unit tests: `test/*.test.ts`
- Integration tests: `test/integration/`
- Docker tests: `test/docker.test.ts`
- Mock data: `test/mocks/`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository.
