# Project context

This folder describes the **current implementation**, not a proposed redesign.

- [Architecture and technology stack](architecture.md): components, data, API,
  configuration, and operational considerations.
- [Architecture diagrams](diagrams.md): runtime, static publishing, reservation,
  and data relationships.

The project has two different experiences: an Express-backed ALLANI Auto
application and a generated, static Prime Cars showcase. On the Node server,
`/allani` is an authenticated, Prime Cars-themed administration page. The
separately published static back-office is a public interactive demo that does
not modify the live database.

Primary sources: [server.js](../server.js), [package.json](../package.json),
[front-office/sync.js](../front-office/sync.js), and
[front-office/README.md](../front-office/README.md).
