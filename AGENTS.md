# Project Rules

This is a JavaScript/TypeScript, C# / .NET, Docker / Containers, Documentation / Markdown with fastapi project.

## Project Structure

<!-- TODO: Describe your project structure here -->
<!-- Example:
- `src/` - Application source code
- `tests/` - Test files
- `docs/` - Documentation
-->

## Code Standards

### JavaScript/TypeScript

- Use TypeScript with strict mode where possible
- Prefer ESM imports over CommonJS require
- Use async/await over raw Promises

### C# / .NET

- Follow .NET naming conventions
- Use async/await for I/O operations
- Use dependency injection via built-in DI container

### Docker / Containers

- Use multi-stage builds for smaller images
- Pin base image versions
- Do not run as root in containers

### Documentation / Markdown

- Use consistent heading levels
- Keep line length under 120 characters where practical
- Include code examples for technical documentation

## Commands

### JavaScript/TypeScript

- **Build:** `npm run build`
- **Test:** `npm test`
- **Lint:** `npm run lint`

### C# / .NET

- **Build:** `dotnet build`
- **Test:** `dotnet test`

### Docker / Containers

- **Build:** `docker build .`
- **Lint:** `hadolint Dockerfile`

### Documentation / Markdown

- **Lint:** `markdownlint "**/*.md"`

## Package Manager

This project uses **uv**. Always use `uv` for installing dependencies.

## Custom Agents

The following custom subagents are available (invoke with `@agent-name`):

- **@backend-developer**: Server-side logic, APIs, and data processing
- **@frontend-developer**: UI implementation, components, and browser APIs
- **@fullstack-developer**: End-to-end feature development across the stack
- **@typescript-pro**: TypeScript type system, generics, and advanced patterns
- **@javascript-pro**: Modern JavaScript, ES modules, and runtime optimization
- **@csharp-developer**: C# and .NET ecosystem, LINQ, and async patterns
- **@react-specialist**: React hooks, state management, and component design
- **@deployment-engineer**: Deployment strategies, blue-green, canary, and rollbacks
- **@devops-engineer**: CI/CD pipelines, infrastructure, and deployment
- **@docker-expert**: Docker optimization, multi-stage builds, and security
- **@platform-engineer**: Internal developer platforms and self-service tooling
- **@sre-engineer**: Site reliability, monitoring, and incident response
- **@code-reviewer**: Code review with security and performance focus
- **@build-engineer**: Build system configuration, caching, and optimization
- **@dependency-manager**: Dependency updates, audit, and compatibility checks
- **@docs-writer**: Technical documentation and API reference writing
- **@git-workflow-manager**: Git workflow, branching strategy, and commit hygiene
- **@test-writer**: Test generation following project patterns
- **@technical-writer**: User guides, tutorials, and knowledge base articles

## Available Skills

The following skills are installed and will be loaded on demand:

- **git-release**: Release notes and version bumps
- **pr-review**: Structured PR review checklist
- **migration**: Database/framework migration planning
- **test-patterns**: Test generation following project conventions
- **deploy**: CI/CD pipeline and deployment setup
- **dependency-audit**: Audit dependencies for vulnerabilities and license issues
- **incident-postmortem**: Structured incident postmortem report generation
- **docker-optimize**: Dockerfile and image size optimization
- **adr-write**: Architecture Decision Record (ADR) authoring
- **api-contract**: OpenAPI/Swagger contract generation and validation
- **changelog-generate**: Changelog generation from commit history
- **ci-pipeline**: CI pipeline configuration and optimization
- **env-setup**: Development environment setup and onboarding
- **error-triage**: Error log triage and prioritization
- **performance-profile**: Performance profiling and bottleneck identification

## Conventions

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Write meaningful commit messages that explain the "why"
- Keep PRs focused on a single concern
