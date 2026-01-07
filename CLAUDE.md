# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

```bash
npm test              # Run unit tests
npm run test:integration  # Run integration tests
npm run test:all      # Run all tests
npm run coverage      # Run unit tests with coverage
npm run coverage:integration  # Run integration tests with coverage
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
```

## Architecture

Composable SCADA server implementing the Supervisor API using factory functions returning immutable objects.

### Package Structure

```
scada-server/
├── index.js                    # Main exports (scadaServer, routes, objects)
├── src/
│   ├── server/
│   │   ├── scadaServer.js      # Main server factory
│   │   ├── routes.js           # Composable route collection
│   │   ├── machineRoute.js     # GET /machines, /machines/:id
│   │   ├── measurementRoute.js # GET /machines/:id/measurements
│   │   ├── measurementStream.js# SSE /machines/:id/measurements/stream
│   │   ├── alertRoute.js       # GET/PATCH /machines/:id/alerts
│   │   ├── alertStream.js      # SSE /machines/:id/alerts/stream
│   │   ├── meltingRoute.js     # GET /machines/:id/meltings
│   │   └── meltingStream.js    # SSE /machines/:id/meltings/stream
│   └── objects/
│       ├── route.js            # Route matching and dispatch
│       ├── jsonResponse.js     # JSON HTTP response
│       ├── sseResponse.js      # SSE connection handler
│       ├── errorResponse.js    # Structured errors
│       ├── timeExpression.js   # Time expression parser
│       ├── pagination.js       # Page-based pagination
│       └── cursor.js           # Cursor-based pagination
└── client/
    ├── index.js                # Client exports
    ├── scadaClient.js          # Main client factory
    ├── machineClient.js        # Machine endpoint methods
    └── sseConnection.js        # SSE connection handler
```

### Server Usage

```javascript
import { meltingMachine } from 'scada';
import { sokolPlant } from 'sokol-scada';
import { scadaServer } from 'scada-server';

const plant = sokolPlant(meltingMachine);
const api = scadaServer('/supervisor/api/v1', plant); // calls plant.init() automatically
http.createServer((req, res) => api.handle(req, res)).listen(3000);
```

### Route Composition

```javascript
// Compose multiple route collections
const combined = routes(routes1, routes2);
```

## Elegant Objects Principles

Constructors may not contain any code except assignment statements.
Implementation inheritance must be avoided at all costs.
Getters must be avoided, as they are symptoms of an anemic object model.
The DDD paradigm must be respected.
Class names may not end with the -er suffix.
Setters must be avoided, as they make objects mutable.
Immutable objects must be favored over mutable ones.
Every class may encapsulate no more than four attributes.
Every class must encapsulate at least one attribute.
Utility classes are strictly prohibited.
Static methods in classes are strictly prohibited.
Method names must respect the CQRS principle: they must be either nouns or verbs.
Methods must never return null.
null may not be passed as an argument.

## Code Style

Every function must have a supplementary docblock preceding it.
Docblocks must be written in English only, using UTF-8 encoding.
Method bodies may not contain blank lines.
Method and function bodies may not contain comments.
Variable names must be single nouns, never compound or composite.
The principle of "Paired Brackets" suggested by Yegor Bugayenko must be respected.
Error and log messages should not end with a period.

## Testing Principles

Every change must be covered by a unit test to guarantee repeatability.
Every test case may contain only one assertion.
In every test, the assertion must be the last statement.
Test cases must be as short as possible.
Tests must be named as full English sentences, stating what the object under test does.
Tests should not use mocks, favoring fake objects and stubs.
Tests must use random values as inputs.
Tests must use ephemeral TCP ports, generated using appropriate library functions.
