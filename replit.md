# AniRealm - Anime Social Network

## Overview

AniRealm is a full-stack anime-themed social network featuring user profiles, posts, communities, a card collection system with gacha mechanics, and friend matching. The application combines social networking features with gamification elements including collectible cards, virtual tokens, and premium membership tiers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server with hot module replacement
- Wouter for lightweight client-side routing instead of React Router
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)

**UI Components & Styling**
- Shadcn UI component library (New York style variant) with Radix UI primitives for accessible, unstyled components
- Tailwind CSS v4 for utility-first styling with custom design tokens
- Custom cyberpunk/anime theme with neon effects and animations
- Framer Motion for advanced animations (card reveals, swipe gestures)
- Custom fonts: Orbitron for display text, Exo 2 for body text

**State Management**
- TanStack Query (React Query) for server state management with automatic caching and refetching
- React Context for authentication state (AuthContext)
- Local storage for client-side data persistence (swipe limits, connections)

**Key Design Patterns**
- Component composition with shared UI primitives
- Custom hooks for reusable logic (useAuth, useIsMobile, useToast)
- Form validation with React Hook Form and Zod resolvers
- Toast notifications via Sonner library

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- Session-based authentication using express-session with MemoryStore
- bcrypt for password hashing (10 rounds)
- RESTful API design with conventional HTTP methods

**Authentication Flow**
- Session cookies with HTTP-only flag for security
- User sessions stored in memory (MemoryStore) with 7-day expiration
- Session secret configurable via environment variable
- Middleware to verify authenticated requests

**API Structure**
- Route handlers in `server/routes.ts` registering all endpoints
- Storage abstraction layer (`server/storage.ts`) for database operations
- Separation of concerns: routes handle HTTP, storage handles data persistence

### Data Storage

**Database**
- PostgreSQL as the primary relational database
- Drizzle ORM for type-safe database queries and schema management
- Connection pooling via node-postgres (pg) library
- Migrations managed through Drizzle Kit in `migrations/` directory

**Schema Design**
- **Users table**: Core user data including credentials, profile info, tokens, premium status, admin flags, and anime interests
- **Posts table**: User-generated content with likes/comments counters
- **Cards table**: Collectible card definitions with rarity, power, element attributes
- **UserCards table**: Junction table for user's card collection
- **MarketListings table**: Card trading marketplace with price and status
- **Communities table**: Group chat rooms with member counts
- **CommunityMessages table**: Chat messages with timestamps
- **SwipeActions table**: Friend-matching swipe history (like/pass)

**Data Relationships**
- One-to-many: User → Posts, User → UserCards
- Foreign key constraints with cascade deletes for data integrity
- Array fields for multi-value attributes (animeInterests)

### External Dependencies

**Core Runtime Libraries**
- Node.js with ES modules (type: "module" in package.json)
- TypeScript for static type checking across the entire codebase

**Authentication & Security**
- bcrypt v6 for password hashing
- express-session with connect-pg-simple for PostgreSQL session store (configured but using MemoryStore)
- Session-based auth (no JWT implementation)

**Database & ORM**
- drizzle-orm v0.39 for database operations
- drizzle-zod for schema-to-Zod validation integration
- pg (node-postgres) for PostgreSQL connections

**UI & Styling**
- @radix-ui/* components for accessible primitives (20+ packages)
- Tailwind CSS with PostCSS
- tailwindcss/vite plugin for optimized builds
- Lucide React for icon components

**Utilities**
- date-fns for date formatting
- nanoid for unique ID generation
- clsx and tailwind-merge for conditional class names
- zod for runtime validation
- class-variance-authority for component variants

**Development Tools**
- tsx for running TypeScript files directly
- esbuild for server bundling in production
- @replit/* plugins for development environment integration

**Build Process**
- Client: Vite builds React app to `dist/public`
- Server: esbuild bundles Express app to `dist/index.cjs` with selective dependency bundling
- Production: Node serves bundled server with static client files

**Environment Variables**
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (defaults to development key)
- `NODE_ENV`: Environment mode (development/production)
- `REPL_ID`: Replit environment detection

**Asset Management**
- Static assets in `client/public/` directory
- Generated images in `attached_assets/generated_images/`
- Dicebear API for avatar generation fallbacks
- Meta image plugin for Open Graph tags with Replit domain detection