# Contributing to MediCare FHIR API

Thank you for your interest in contributing to the MediCare FHIR API! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/medicare-api.git
   cd medicare-api
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/original-owner/medicare-api.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes in your feature branch
2. Follow the [coding standards](#coding-standards)
3. Add tests for your changes
4. Ensure all tests pass:
   ```bash
   npm test
   ```
5. Update documentation as needed
6. Commit your changes with clear, descriptive commit messages
7. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Submit a pull request to the main repository

## Pull Request Process

1. Ensure your PR includes tests for any new functionality
2. Update the README.md or relevant documentation with details of changes
3. The PR should work on the main development branch
4. Include a clear description of the changes and their purpose
5. Link any related issues using GitHub's issue linking syntax
6. Wait for code review and address any feedback

## Coding Standards

This project follows the NestJS style guide and TypeScript best practices:

- Use 2 spaces for indentation
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use kebab-case for file names
- Follow the Single Responsibility Principle
- Document public APIs with JSDoc comments
- Use strong typing (avoid `any` type when possible)

We use ESLint and Prettier for code formatting. Run the following commands before submitting:

```bash
npm run lint
npm run format
```

## Testing Guidelines

- Write unit tests for all new functionality
- Maintain or improve code coverage
- Write integration tests for API endpoints
- Test both success and error cases
- Mock external dependencies

Run tests with:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Documentation

- Keep API documentation up-to-date
- Document all public methods and classes
- Update Swagger annotations for API changes
- Add examples for new functionality

## Issue Reporting

- Use the GitHub issue tracker to report bugs
- Include detailed steps to reproduce the issue
- Include environment details (OS, Node.js version, etc.)
- Suggest possible solutions if you have ideas

## FHIR Compliance

When working with FHIR resources:

- Follow the FHIR R4 specification
- Validate resources against FHIR profiles
- Maintain backward compatibility
- Document any extensions to standard resources

Thank you for contributing to the MediCare FHIR API! 