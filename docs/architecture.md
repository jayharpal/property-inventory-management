# Architecture

The Property Management Platform follows a modern full-stack JavaScript architecture with clear separation of concerns.

## High-Level Architecture

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│   Client (React)  │<────│  Server (Express) │<────│  Database (Postgres) │
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

## Client Architecture

The frontend is built with React and follows a component-based architecture:

```
┌─────────────────────────────────────────────┐
│ Components                                  │
│ ┌───────────────┐  ┌───────────────────┐   │
│ │ Pages         │  │ UI Components     │   │
│ └───────────────┘  └───────────────────┘   │
│ ┌───────────────┐  ┌───────────────────┐   │
│ │ Layout        │  │ Forms             │   │
│ └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ State Management                            │
│ ┌───────────────┐  ┌───────────────────┐   │
│ │ React Query   │  │ Context API       │   │
│ └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ API Communication                           │
│ ┌───────────────────────────────────────┐   │
│ │ Fetch Client / React Query            │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Key Frontend Components

- **Pages**: Container components for each route
- **Layout**: Consistent UI structure (sidebar, header)
- **UI Components**: Reusable UI elements using Shadcn
- **Forms**: Data entry with React Hook Form and Zod validation
- **Data Fetching**: TanStack Query for server state management

## Server Architecture

The backend follows a layered architecture:

```
┌─────────────────────────────────────────────┐
│ API Layer (Express Routes)                  │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Business Logic Layer                        │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Data Access Layer (Drizzle ORM)             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Database (PostgreSQL)                       │
└─────────────────────────────────────────────┘
```

### Key Backend Components

- **Routes**: Define API endpoints and handle HTTP requests
- **Storage**: Abstract data access operations
- **Authentication**: Passport.js for user authentication
- **Services**: Handle business logic and external integrations
- **Schema**: Define data models with validation using Drizzle and Zod

## Data Flow

1. Client makes request via React Query
2. Express route handler receives request
3. Request is validated with Zod schemas
4. Business logic is applied
5. Data is fetched/modified via storage layer
6. Response is sent back to client
7. Client updates UI with new data

## Key Design Patterns

- **Repository Pattern**: Storage layer abstracts database operations
- **Dependency Injection**: Services receive dependencies via constructor
- **Middleware Pattern**: Express middleware for cross-cutting concerns
- **Component Composition**: UI built from small, reusable components
- **Custom Hooks**: Encapsulate and reuse React logic

## Authentication Flow

1. User submits credentials
2. Server validates credentials
3. Session is created with Passport.js
4. Session ID is stored in cookie
5. Subsequent requests include cookie for authentication
6. Protected routes check for valid session

## Deployment Architecture

The application is deployed as a monolithic application:

1. Frontend assets are built with Vite
2. Express server serves both API and static assets
3. PostgreSQL database for persistence
4. Replit for hosting
