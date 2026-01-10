# scada-server

Composable SCADA server with REST and SSE endpoints.

## Install

```
npm install scada-server
```

## Usage

```javascript
import http from 'http';
import { scadaServer } from 'scada-server';

const api = scadaServer('/api', plant);
http.createServer((req, res) => api.handle(req, res)).listen(3000);
```

## Client

```javascript
import { scadaClient } from 'scada-server/client';

const client = scadaClient('http://localhost:3000/api', fetch, EventSource);
const machine = client.machine('icht1');
const measurements = await machine.measurements({ from: 'now-1h', to: 'now' });
```

## Modules

### Server
- `scadaServer`
- `routes`

### Objects
- `route`
- `jsonResponse`
- `sseResponse`
- `errorResponse`
- `timeExpression`
- `pagination`
- `cursor`

### Client
- `scadaClient`
- `machineClient`
- `sseConnection`

## License

MIT
