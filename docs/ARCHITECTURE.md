# DeFi Builder Architecture

**Last Updated**: 2025-01-04

## System Overview

DeFi Builder is a full-stack application for building, testing, and executing DeFi strategies. The architecture follows a modern, type-safe approach with clear separation of concerns.

### Key Principles

- **Type Safety**: End-to-end type safety with TypeScript and tRPC
- **Modularity**: Feature-based organization with shared utilities
- **Performance**: Code splitting, lazy loading, and optimized bundles
- **Scalability**: Horizontal scaling support with stateless backend
- **Security**: Server-side API key management, JWT authentication

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React + Vite)"
        A[React Components] --> B[React Hooks]
        B --> C[tRPC Client]
        C --> D[Web3 Services]
        D --> E[Wagmi/Viem]
    end
    
    subgraph "Backend (Node.js + Express)"
        F[Express Server] --> G[tRPC Router]
        G --> H[Services]
        H --> I[Prisma ORM]
        I --> J[(PostgreSQL)]
        H --> K[Redis Cache]
        H --> L[External APIs]
    end
    
    subgraph "Blockchain"
        E --> M[Ethereum]
        E --> N[Polygon]
        E --> O[Arbitrum]
    end
    
    C -->|HTTP/WebSocket| F
    L --> P[CoinGecko API]
    L --> Q[Gemini AI]
    
    style A fill:#e1f5ff
    style F fill:#fff4e1
    style M fill:#f0f0f0
```

## Frontend Architecture

### Component Structure

```
components/
├── ui/              # Reusable UI components (Button, Modal, etc.)
├── modals/          # Modal dialogs (Backtest, Settings, etc.)
├── workspace/       # Workspace-specific components
└── [feature]/       # Feature-specific components
```

### State Management

- **Local State**: React `useState`, `useReducer`
- **Server State**: TanStack Query (via tRPC)
- **Web3 State**: Wagmi hooks
- **Workspace State**: Custom `useWorkspaceState` hook

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant H as Hook
    participant T as tRPC
    participant B as Backend
    
    U->>C: User Action
    C->>H: Call Hook
    H->>T: tRPC Query/Mutation
    T->>B: HTTP Request
    B->>T: Response
    T->>H: Typed Data
    H->>C: Update State
    C->>U: UI Update
```

## Backend Architecture

### Service Layer

```
backend/src/
├── services/        # Business logic
│   ├── ai.ts       # AI service (Gemini)
│   └── priceFeed.ts # Price data service
├── trpc/           # API routes
│   ├── router.ts   # Main router
│   └── routes/     # Route modules
├── auth/           # Authentication
├── cache/          # Redis caching
└── db/             # Database client
```

### Database Schema

```mermaid
erDiagram
    User ||--o{ Strategy : has
    User ||--o{ BacktestResult : has
    User ||--o{ AuditLog : generates
    Strategy ||--o{ BacktestResult : produces
    
    User {
        string id PK
        string walletAddress UK
        datetime createdAt
    }
    
    Strategy {
        string id PK
        string userId FK
        string name
        json blocks
        datetime createdAt
        datetime updatedAt
    }
    
    BacktestResult {
        string id PK
        string strategyId FK
        string userId FK
        json metrics
        json equityCurve
        datetime createdAt
    }
    
    AuditLog {
        string id PK
        string userId FK
        string eventType
        json metadata
        datetime timestamp
    }
```

## Data Flow: Strategy Execution

```mermaid
sequenceDiagram
    participant U as User
    participant W as Workspace
    participant V as Validator
    participant B as Backtest Engine
    participant D as Data Fetcher
    participant E as Block Executor
    participant M as Metrics Calculator
    
    U->>W: Build Strategy
    W->>V: Validate Strategy
    V->>W: Validation Result
    U->>W: Run Backtest
    W->>B: Execute Backtest
    B->>D: Fetch Historical Data
    D->>B: Price Data
    B->>E: Execute Blocks
    E->>B: Execution Results
    B->>M: Calculate Metrics
    M->>B: Metrics
    B->>W: Backtest Result
    W->>U: Display Results
```

## Security Architecture

```mermaid
graph LR
    A[Client Request] --> B[Rate Limiter]
    B --> C[CSRF Check]
    C --> D[Auth Middleware]
    D --> E[tRPC Router]
    E --> F[Zod Validation]
    F --> G[Service Layer]
    G --> H[Database]
    
    style B fill:#ffcccc
    style C fill:#ffcccc
    style D fill:#ffcccc
    style F fill:#ccffcc
```

### Security Layers

1. **Rate Limiting**: Prevents abuse
2. **CSRF Protection**: Token validation
3. **Authentication**: JWT with httpOnly cookies
4. **Input Validation**: Zod schemas
5. **Output Sanitization**: XSS prevention

## Deployment Architecture

```mermaid
graph TB
    subgraph "CDN"
        A[Static Assets]
    end
    
    subgraph "Application Server"
        B[Frontend Build]
        C[Backend API]
    end
    
    subgraph "Data Layer"
        D[(PostgreSQL)]
        E[(Redis)]
    end
    
    subgraph "External Services"
        F[CoinGecko API]
        G[Gemini AI]
        H[Doppler Secrets]
    end
    
    A --> B
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    
    style A fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#f0f0f0
    style E fill:#ffe1f5
```

## Technology Stack

### Frontend
- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: TanStack Query + React Hooks
- **Web3**: Wagmi + Viem
- **UI**: Custom components + TailwindCSS
- **Testing**: Vitest + Playwright

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express
- **API**: tRPC
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Authentication**: JWT
- **Validation**: Zod

### Blockchain
- **Libraries**: Wagmi, Viem
- **Chains**: Ethereum, Polygon, Arbitrum, Optimism, Sepolia
- **Contracts**: Solidity (Foundry)

## Key Design Decisions

### 1. Type Safety First
- **tRPC**: End-to-end type safety
- **TypeScript**: Strict mode enabled
- **Zod**: Runtime validation

### 2. Modular Architecture
- **Feature-based**: Features are self-contained
- **Service layer**: Business logic separated
- **Reusable components**: UI components in `components/ui/`

### 3. Performance
- **Code splitting**: Lazy loading for modals
- **Virtual scrolling**: For large lists
- **Caching**: Redis for API responses
- **Debouncing**: For validation and search

### 4. Security
- **API keys**: Server-side only (Doppler)
- **Authentication**: JWT with httpOnly cookies
- **Rate limiting**: Per endpoint
- **Input validation**: Zod schemas

## Future Architecture Considerations

### Scalability
- **Horizontal scaling**: Stateless backend
- **Database**: Read replicas for queries
- **Caching**: Redis cluster
- **CDN**: Static asset delivery

### Monitoring
- **Logging**: Structured logging (Sentry)
- **Metrics**: Performance monitoring
- **Alerting**: Error tracking
- **Audit**: Comprehensive audit logs

### Extensibility
- **Plugin system**: For custom blocks
- **Protocol integrations**: Modular protocol services
- **Multi-chain**: Chain-agnostic design
- **API versioning**: tRPC versioning support

---

For more details, see:
- [API Documentation](./API.md)
- [Backend Setup](../backend/SETUP.md)
- [Deployment Guide](../DEPLOYMENT.md)

