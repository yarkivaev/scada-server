# scada-server

Composable SCADA server implementing the Supervisor API with REST and SSE endpoints.

## Installation

```bash
npm install
```

## Usage

### Standalone Server

```javascript
import http from 'http';
import { meltingMachine } from 'scada';
import { sokolPlant } from 'sokol-scada';
import { scadaServer } from 'scada-server';

const plant = sokolPlant(meltingMachine);
const api = scadaServer('/supervisor/api/v1', plant);
http.createServer((req, res) => api.handle(req, res)).listen(3000);
```

### Route Composition

```javascript
import { routes } from 'scada-server';

const combined = routes(supervisorRoutes, otherRoutes);
```

### JS Client

```javascript
import { scadaClient } from 'scada-server/client';

const client = scadaClient('http://localhost:3000/api/v1', fetch, EventSource);

// List machines
const machines = await client.machines();

// Get machine-specific client
const machine = client.machine('icht1');

// REST endpoints
const info = await machine.info();
const measurements = await machine.measurements({ from: 'now-1h', to: 'now' });
const alerts = await machine.alerts({ page: 1, size: 10 });
const meltings = await machine.meltings({ limit: 10 });

// SSE streams
const stream = machine.measurementStream({ keys: ['voltage'] });
stream.on('measurement', (data) => console.log(data));
stream.close();
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /machines | List machines |
| GET | /machines/:id | Get machine |
| GET | /machines/:id/measurements | Get measurements |
| GET | /machines/:id/measurements/stream | SSE measurements |
| GET | /machines/:id/alerts | Get alerts (paginated) |
| GET | /machines/:id/alerts/stream | SSE alerts |
| PATCH | /machines/:id/alerts/:alertId | Acknowledge alert |
| GET | /machines/:id/meltings | Get meltings (cursor) |
| GET | /machines/:id/meltings/:meltingId | Get melting |
| GET | /machines/:id/meltings/stream | SSE meltings |

## Development

```bash
npm test              # Run unit tests
npm run test:all      # Run all tests
npm run coverage      # Check coverage
npm run lint          # Run ESLint
```
