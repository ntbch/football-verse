# Realtime Gateway Design (Spring Boot + Node.js Integration)

This document specifies the architecture and implementation plan for moving the Football Verse backend toward a hybrid microservice setup by introducing an integrated Node.js API Gateway and Realtime WebSocket service.

---

## 1. Understanding Summary

* **Objective**: Create a single entry point (API Gateway) for the frontend Next.js application that routes HTTP requests to downstream microservices and serves as a high-concurrency WebSocket/realtime hub (Realtime Service) for push notifications and live updates.
* **Scope**: 
  * Node.js integrated server running Express, `http-proxy-middleware`, and `socket.io`.
  * Integration of Redis into the backend services infrastructure.
  * Inter-service event communication using Redis Pub/Sub.
* **Core Responsibilities**:
  * Route `/api/v1/*` HTTP traffic to Spring Boot Core.
  * Route `/matches/*`, `/standings/*`, `/game/*` HTTP traffic to Python Match/Game.
  * Accept WebSockets connection under `/socket.io/*` and push realtime events (scores, leaderboards, notifications).
* **Non-Goals**: Re-writing authentication, modifying prediction databases, or implementing game simulation.

---

## 2. Major Assumptions

1. **Redis Event Broker**: A Redis container is running in local Docker Compose. All services (Spring Boot, Python, Node) can connect to it.
2. **Pass-Through Authentication**: The gateway is NOT responsible for verifying JWT signatures. It passes the `Authorization: Bearer <JWT>` header unchanged down to Spring Boot for validation.
3. **WebSocket Authentication**: The Next.js frontend will supply the JWT token during the WebSocket connection handshake (e.g., via query string parameter `token` or initial handshake payload).
4. **Low Scale Dev Mode**: Designed for local development and learning purposes, optimized for low overhead and rapid startup.

---

## 3. Decision Log

### Decision 1: Integrated Node.js service (Express + Socket.io)
* **Description**: A single Node.js service containing both reverse-proxy (API Gateway) and WebSockets server.
* **Alternatives Considered**: 
  * Separate services for Gateway (e.g., Nginx) and WebSockets.
  * Fastify + native WebSockets (`ws`).
* **Rationale**: Fastify/Nginx introduces unnecessary operational complexity. Express and Socket.io are mature, easy to debug, handle fallback transports automatically, and fit the current greenfield phase well.

### Decision 2: Redis Pub/Sub for inter-service communication
* **Description**: Microservices publish update events to Redis channels; Node.js subscribes to them to fan out.
* **Alternatives Considered**: HTTP Webhooks, Database Polling.
* **Rationale**: Database polling is slow and resource-heavy. Webhooks couple services to specific HTTP endpoints. Redis Pub/Sub provides clean decoupling and high-performance pub/sub mechanics.

### Decision 3: WebSockets over Server-Sent Events (SSE)
* **Description**: Use Socket.io/WebSockets for realtime streams.
* **Alternatives Considered**: Server-Sent Events (SSE).
* **Rationale**: WebSockets support bidirectional communication, which will support future PvP features, real-time match room chat, and game commands without requiring another protocol switch.

### Decision 4: JWT Pass-through
* **Description**: Gateway forwards HTTP Authorization header downstream without local validation.
* **Alternatives Considered**: Validate JWT at the Gateway using a shared secret.
* **Rationale**: Keep gateway logic simple and avoid duplicating JWT parsing code. Spring Security in the backend already works perfectly.

---

## 4. Component Design

### 4.1. Directory Structure

```text
realtime-gateway/
|-- src/
|   |-- server.ts       # Express Server & Socket.io initialization
|   |-- proxy.ts        # API Gateway reverse-proxy configuration
|   |-- socket.ts       # Socket.io connection and Redis Sub setup
|-- package.json
|-- tsconfig.json
|-- Dockerfile
```

### 4.2. Routing Table

| Request Path | Downstream URL | Service |
|---|---|---|
| `/api/v1/*` | `http://backend:8080/api/v1/*` | Spring Boot Core |
| `/matches/*` | `http://match-engine:8090/matches/*` | Python Match/Game |
| `/standings/*` | `http://match-engine:8090/standings/*` | Python Match/Game |
| `/game/*` | `http://match-engine:8090/game/*` | Python Match/Game |
| `/socket.io/*` | Local handler | Node Realtime Gateway |

---

## 5. Verification Plan

### Automated Verification
* Run integration tests for proxy routing.
* Run unit tests verifying that Redis message triggers Socket.io emission.

### Manual Verification
* Start PostgreSQL, Redis, Spring Boot, Python Match Engine, and Realtime Gateway via Docker Compose.
* Verify `/api/v1/auth/me` returns correct user data via Gateway port 8000.
* Connect a WebSocket client to Gateway, publish a test payload to `realtime:matches` via Redis CLI, and verify the client receives the event.
