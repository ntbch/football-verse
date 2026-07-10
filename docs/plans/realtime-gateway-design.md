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
  * Route `/matches/*` and `/standings/*` to Prediction Service; route `/game/*` to Spring Game Service.
  * Accept WebSockets connection under `/socket.io/*` and push realtime events (scores, leaderboards, notifications).
* **Non-Goals**: Re-writing authentication, modifying prediction databases, or implementing game simulation.

---

## 2. Major Assumptions

1. **Redis Event Broker**: A Redis container is running in local Docker Compose. All services (Spring Boot, Python, Node) can connect to it.
2. **Authentication**: Core routes pass JWT through. Game routes validate JWT at the gateway, then receive trusted internal identity headers in Game Service.
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

### Decision 4: Route-specific JWT handling
* **Description**: Core routes pass JWT through; `/game/*` validates JWT at Gateway and forwards trusted identity headers to Game Service.
* **Rationale**: Core keeps existing Spring Security while Game Service avoids coupling to `core_db`.

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
| `/matches/*` | `http://prediction-service:8090/matches/*` | Prediction Service |
| `/standings/*` | `http://prediction-service:8090/standings/*` | Prediction Service |
| `/game/*` | `http://game-service:8081/game/*` | Spring Game Service |
| `/socket.io/*` | Local handler | Node Realtime Gateway |

---

## 5. Verification Plan

### Automated Verification
* Run integration tests for proxy routing.
* Run unit tests verifying that Redis message triggers Socket.io emission.

### Manual Verification
* Start both PostgreSQL databases, Core, Prediction Service, Game Service, Match Engine, Redis, and Gateway via Docker Compose.
* Verify `/api/v1/auth/me` returns correct user data via Gateway port 8000.
* Connect a WebSocket client to Gateway, publish a test payload to `realtime:matches` via Redis CLI, and verify the client receives the event.
