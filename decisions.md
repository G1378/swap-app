# Backend Architecture & Design Decisions

## Phase 1 Overview

This document captures key backend decisions made during Phase 1 development of the Local Item Swap application.

---

## Technology Stack Decisions

### Why Next.js App Router?
- **Decision**: Use Next.js 14+ with App Router
- **Rationale**: 
  - Modern React framework with excellent DX
  - Built-in API routes eliminate need for separate backend server
  - Server components and server actions ready for Phase 2
  - Great TypeScript support
  - Easy deployment to Vercel or similar platforms

### Why Prisma ORM?
- **Decision**: Use Prisma as the ORM
- **Rationale**:
  - Type-safe database queries
  - Excellent migration system
  - Auto-generated client based on schema
  - Great developer experience with Prisma Studio
  - Strong PostgreSQL support

### Why PostgreSQL?
- **Decision**: PostgreSQL as the database
- **Rationale**:
  - ACID compliant (important for swap transactions)
  - Excellent support for complex queries
  - UUID support built-in
  - Can add PostGIS for geospatial features later
  - Free hosting options available

### Why NextAuth?
- **Decision**: NextAuth for authentication
- **Rationale**:
  - Built specifically for Next.js
  - Supports multiple providers out of the box
  - Database session management via Prisma adapter
  - Secure by default
  - Active community and maintenance

---

## Database Design Decisions

### UUID Primary Keys
- **Decision**: Use UUIDs instead of auto-incrementing integers
- **Rationale**:
  - More secure (harder to enumerate resources)
  - Distributed-friendly (can generate client-side if needed)
  - No collision concerns with multiple database instances
  - Future-proof for microservices architecture

### SwapItem Join Table
- **Decision**: Create explicit SwapItem join table with type field
- **Rationale**:
  - Supports multi-item swaps from the start
  - Type field distinguishes offered vs requested items
  - Makes queries clearer than implicit many-to-many
  - Easier to extend with additional metadata later

### Session Storage
- **Decision**: Store sessions in database, not JWT
- **Rationale**:
  - Can revoke sessions immediately
  - No token size limitations
  - Easier to audit active sessions
  - Works seamlessly with Prisma adapter

### Location Storage
- **Decision**: Store lat/lng as separate float fields
- **Rationale**:
  - Simple for Phase 1 (no complex queries yet)
  - Can migrate to PostGIS Point type in Phase 2
  - Easier to mock/test
  - Sufficient for basic distance calculations

### Item Availability Flag
- **Decision**: Use `is_available` boolean instead of soft delete
- **Rationale**:
  - Items should remain in database for swap history
  - Users might want to relist items
  - Simplifies queries (no need to filter deleted items everywhere)
  - Clear state management

---

## API Design Decisions

### REST-like Routes
- **Decision**: Use REST-like API structure
- **Rationale**:
  - Familiar to most developers
  - Clear resource hierarchy
  - Next.js file-based routing maps naturally
  - Easy to document
  - GraphQL would be overkill for Phase 1

### Nested User Resources
- **Decision**: Use `/api/users/me` instead of `/api/user` or `/api/profile`
- **Rationale**:
  - RESTful pattern for current user
  - Allows future `/api/users/:id` for viewing others
  - Clear that it's a user resource
  - Standard pattern in many APIs

### Separate Sent/Received Swaps
- **Decision**: Return `{sent: [], received: []}` structure from `/api/swaps/my`
- **Rationale**:
  - Clearer than single array with mixed types
  - Frontend can easily render two separate lists
  - Different UI actions for sent vs received
  - Performance: no client-side filtering needed

### Item Ownership in DELETE
- **Decision**: Enforce ownership checks in DELETE endpoint
- **Rationale**:
  - Security: users can't delete others' items
  - Explicit 403 Forbidden response for clarity
  - Separated from 404 Not Found (different reasons)
  - Standard pattern for resource protection

---

## Authentication Flow Decisions

### Auto-Create User on First Login
- **Decision**: Automatically create User record on first authentication
- **Rationale**:
  - Seamless onboarding experience
  - NextAuth adapter handles this
  - No separate registration step needed
  - Profile can be completed later

### Separate Avatar Fields
- **Decision**: Keep both `image` (NextAuth) and `avatar_url` (app-specific)
- **Rationale**:
  - `image` is managed by NextAuth for OAuth profiles
  - `avatar_url` allows users to set custom avatar
  - Fallback chain: avatar_url → image → default
  - Maintains NextAuth compatibility

### Session Validation Helper
- **Decision**: Create `requireAuth()` utility function
- **Rationale**:
  - DRY: avoid repeating session checks
  - Consistent error responses
  - Easy to extend with role checks later
  - Cleaner API route code

---

## Swap Logic Decisions

### Status Change Authorization
- **Decision**: Only recipient can accept, both parties can reject
- **Rationale**:
  - Recipient owns the requested items
  - Requester can cancel anytime (via reject)
  - Clear ownership model
  - Prevents unauthorized status changes

### Items Become Unavailable on Accept
- **Decision**: Mark all swap items unavailable when accepted
- **Rationale**:
  - Prevents double-swapping
  - Clear state transition
  - Can be manually relisted if swap falls through
  - Simpler than complex reservation system

### Multi-Item Support from Start
- **Decision**: Support multiple items in swap requests
- **Rationale**:
  - More flexible for users
  - Schema supports it naturally
  - Minimal additional complexity
  - Common use case ("my book for your game and DVD")

---

## Query Optimization Decisions

### Strategic Indexes
- **Decision**: Add indexes on foreign keys, created_at, and query fields
- **Rationale**:
  - Foreign keys: JOIN performance
  - created_at: ordering and pagination
  - category, condition: common filters
  - is_available: every item list query
  - Balance: not over-indexing

### Include User in Item Queries
- **Decision**: Always include basic user info when fetching items
- **Rationale**:
  - Avoids N+1 queries
  - Frontend needs user data for display
  - Minimal overhead (just a few fields)
  - Better UX (no loading spinners for user data)

---

## Validation Decisions

### Enum Validation in API
- **Decision**: Validate enums in API routes, not just at database level
- **Rationale**:
  - Clearer error messages
  - Catches errors earlier
  - Better developer experience
  - Database still enforces as final check

### Latitude/Longitude Bounds
- **Decision**: Validate lat (-90 to 90) and lng (-180 to 180)
- **Rationale**:
  - Prevent invalid coordinates
  - Clear error messages
  - Database doesn't enforce bounds on floats
  - Important for future distance calculations

---

## Error Handling Decisions

### Consistent Error Format
- **Decision**: All errors return `{error: "message"}`
- **Rationale**:
  - Easy for frontend to handle
  - Consistent across all endpoints
  - Simple to document
  - Can extend with error codes later if needed

### Specific HTTP Status Codes
- **Decision**: Use appropriate status codes (400, 401, 403, 404, 500)
- **Rationale**:
  - RESTful best practice
  - Helps debugging
  - Frontend can handle different errors differently
  - Standard HTTP semantics

---

## Security Decisions

### No Sensitive Data in Responses
- **Decision**: Never return email verification tokens, passwords, etc.
- **Rationale**:
  - NextAuth handles sensitive data
  - Select only necessary fields in queries
  - Prevents accidental leaks
  - Follows principle of least privilege

### Transaction for Swap Creation
- **Decision**: Use Prisma transaction for creating swaps with items
- **Rationale**:
  - Ensures atomicity
  - Prevents orphaned SwapRequests
  - Rollback on any failure
  - Data consistency guaranteed

---

## Future Considerations

### Distance Filtering (Stubbed)
- **Current**: Query parameter accepted but not implemented
- **Phase 2**: Will implement using PostGIS or calculation formula
- **Rationale**: Complex feature, not blocking MVP

### Geospatial Queries
- **Current**: Simple lat/lng floats
- **Phase 2**: Consider PostGIS Point type and spatial indexes
- **Rationale**: Better performance for radius queries

### Pagination
- **Current**: Returns all items
- **Phase 2**: Add cursor or offset-based pagination
- **Rationale**: Not needed with small datasets, easy to add later

### Image Upload
- **Current**: Avatar URL is just a string
- **Phase 2**: Add image upload service (S3, Cloudinary, etc.)
- **Rationale**: Requires infrastructure setup, not blocking MVP

### Real-time Updates
- **Current**: REST API only
- **Phase 2**: Consider WebSockets or Server-Sent Events
- **Rationale**: Nice to have, not essential for Phase 1

---

## Development Workflow

### Migration Strategy
- **Decision**: Use `prisma migrate dev` for development
- **Rationale**:
  - Deterministic migrations
  - Version controlled
  - Easy to rollback
  - Production ready

### Environment Variables
- **Decision**: Use `.env` file with clear `.env.example`
- **Rationale**:
  - Standard practice
  - Easy for developers to set up
  - Git-ignored by default
  - Clear documentation of required vars

---

## Success Criteria Met

✅ User can authenticate (Google + Email)
✅ User profile persists in database
✅ Prisma schema defined and migrates cleanly
✅ All required API endpoints exist
✅ API contract documented
✅ Backend runs locally
✅ Code is readable and commented
✅ No hardcoded secrets
✅ Following specifications exactly
