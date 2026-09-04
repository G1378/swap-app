# Phase 1 Setup & Verification Guide

## Pre-Setup Checklist

Before starting, ensure you have:

- [ ] Node.js 18 or higher installed (`node --version`)
- [ ] PostgreSQL 14 or higher installed and running
- [ ] A PostgreSQL database created (or permissions to create one)
- [ ] Google Cloud Console access (for OAuth)
- [ ] (Optional) SMTP server credentials for email login

## Setup Steps

### Step 1: Install Dependencies

```bash
npm install
```

**Verify**: Check that `node_modules` folder exists

### Step 2: Configure Database

1. Create a PostgreSQL database:

```bash
createdb local_item_swap
```

Or using psql:

```sql
CREATE DATABASE local_item_swap;
```

2. Update `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/local_item_swap?schema=public"
```

**Verify**: Test connection with `psql -d local_item_swap`

### Step 3: Configure Google OAuth

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable "Google+ API" in APIs & Services
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: "Web application"
6. Add authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Copy Client ID and Client Secret
8. Add to `.env`:

```env
GOOGLE_CLIENT_ID="your_client_id_here"
GOOGLE_CLIENT_SECRET="your_client_secret_here"
```

### Step 4: Configure NextAuth

1. Generate a secret:

```bash
openssl rand -base64 32
```

2. Add to `.env`:

```env
NEXTAUTH_SECRET="generated_secret_here"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 5: (Optional) Configure Email Provider

For magic link login, configure SMTP:

```env
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="noreply@yourdomain.com"
```

Common providers:
- **Gmail**: `smtp://your-email@gmail.com:app-password@smtp.gmail.com:587`
- **SendGrid**: `smtp://apikey:YOUR_API_KEY@smtp.sendgrid.net:587`
- **Mailgun**: `smtp://postmaster@domain:password@smtp.mailgun.org:587`

### Step 6: Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate
```

When prompted, name your migration (e.g., "initial_schema")

**Verify**: Check that `prisma/migrations` folder contains migration files

### Step 7: Start Development Server

```bash
npm run dev
```

**Verify**: Server starts on http://localhost:3000

## Verification Tests

### Test 1: Server Running

- [ ] Visit http://localhost:3000
- [ ] See homepage with API endpoint list
- [ ] No console errors

### Test 2: Database Connection

```bash
npm run prisma:studio
```

- [ ] Prisma Studio opens in browser
- [ ] Can see all tables: User, Account, Session, VerificationToken, Item, SwapRequest, SwapItem
- [ ] Tables are empty (no data yet)

### Test 3: Authentication Flow

1. Visit http://localhost:3000/api/auth/signin
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Redirected back to app

- [ ] Authentication successful
- [ ] User record created in database
- [ ] Session cookie set

### Test 4: User Profile API

Using browser DevTools or Postman, test authenticated endpoints:

```bash
# Get user profile (requires authentication)
curl -X GET http://localhost:3000/api/users/me \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

- [ ] Returns user data
- [ ] Status code 200

```bash
# Update user profile
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","bio":"I love swapping!"}'
```

- [ ] Returns updated user data
- [ ] Changes reflected in database

### Test 5: Items API

```bash
# List items (no auth required)
curl http://localhost:3000/api/items
```

- [ ] Returns empty array (no items yet)
- [ ] Status code 200

```bash
# Create item (requires auth)
curl -X POST http://localhost:3000/api/items \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Item",
    "description": "A test item for swapping",
    "category": "electronics",
    "condition": "good"
  }'
```

- [ ] Returns created item with ID
- [ ] Status code 201
- [ ] Item appears in database

```bash
# Get item by ID
curl http://localhost:3000/api/items/ITEM_ID_FROM_ABOVE
```

- [ ] Returns item details
- [ ] Includes user information

```bash
# Delete item (requires auth and ownership)
curl -X DELETE http://localhost:3000/api/items/ITEM_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

- [ ] Returns success message
- [ ] Item removed from database

### Test 6: Swap Requests API

(Requires creating items first and having a second user)

```bash
# Create swap request
curl -X POST http://localhost:3000/api/swaps \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "offered_item_ids": ["your-item-id"],
    "requested_item_ids": ["other-users-item-id"]
  }'
```

- [ ] Returns created swap request
- [ ] Status code 201

```bash
# Get my swaps
curl http://localhost:3000/api/swaps/my \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

- [ ] Returns sent and received swaps
- [ ] Includes all swap details

```bash
# Update swap status
curl -X PATCH http://localhost:3000/api/swaps/SWAP_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"accepted"}'
```

- [ ] Status updated in database
- [ ] Items marked as unavailable when accepted

## Common Issues & Solutions

### Issue: Database connection failed

**Solution**: 
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in DATABASE_URL
- Ensure database exists: `psql -l`

### Issue: Prisma Client not found

**Solution**:
```bash
npm run prisma:generate
```

### Issue: Migration fails

**Solution**:
```bash
# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Or manually drop and recreate
dropdb local_item_swap
createdb local_item_swap
npm run prisma:migrate
```

### Issue: Google OAuth not working

**Solution**:
- Verify redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Check Google OAuth credentials are correct
- Ensure Google+ API is enabled in console

### Issue: 401 Unauthorized on API calls

**Solution**:
- Ensure you're authenticated (visit /api/auth/signin)
- Include session cookie in requests
- Check NEXTAUTH_SECRET is set correctly

## Phase 1 Success Criteria Verification

Run through this checklist to confirm Phase 1 is complete:

### Database & Schema
- [ ] PostgreSQL database created and accessible
- [ ] Prisma schema defines all required tables (User, Item, SwapRequest, SwapItem)
- [ ] Prisma schema includes NextAuth tables (Account, Session, VerificationToken)
- [ ] All enums defined (ItemCondition, SwapStatus, SwapItemType)
- [ ] Indexes added on foreign keys and query fields
- [ ] Migrations run successfully without errors

### Authentication
- [ ] NextAuth configured with Google OAuth provider
- [ ] NextAuth configured with Email provider
- [ ] Sessions stored in database via Prisma adapter
- [ ] User auto-created on first login
- [ ] Sessions persist across page refresh

### API Endpoints - Users
- [ ] GET /api/users/me returns authenticated user profile
- [ ] PATCH /api/users/me updates user profile
- [ ] Unauthenticated requests return 401

### API Endpoints - Items
- [ ] GET /api/items lists all available items
- [ ] GET /api/items supports category filter
- [ ] GET /api/items supports condition filter
- [ ] POST /api/items creates new item (auth required)
- [ ] GET /api/items/:id returns item details
- [ ] DELETE /api/items/:id deletes item (owner only)

### API Endpoints - Swaps
- [ ] POST /api/swaps creates swap request
- [ ] POST /api/swaps validates item ownership and availability
- [ ] PATCH /api/swaps/:id updates swap status
- [ ] PATCH /api/swaps/:id enforces authorization rules
- [ ] GET /api/swaps/my returns user's sent and received swaps

### Documentation
- [ ] docs/api.md contains complete API reference
- [ ] docs/api.md includes request/response examples
- [ ] docs/decisions.md documents backend architecture
- [ ] README.md contains setup instructions
- [ ] .env.example lists all required environment variables

### Code Quality
- [ ] No hardcoded secrets in code
- [ ] Code is readable with comments where needed
- [ ] TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Consistent code style

### Development Workflow
- [ ] Backend starts with `npm run dev`
- [ ] No errors in console on startup
- [ ] Hot reload works for code changes
- [ ] Prisma Studio accessible via `npm run prisma:studio`

## Next Steps

Phase 1 is complete! You now have:
✅ A working backend API
✅ User authentication
✅ Database with proper schema
✅ All CRUD operations for items and swaps
✅ Complete documentation

**Ready for Phase 2**: Frontend UI development

## Getting Help

If you encounter issues:

1. Check the troubleshooting section in README.md
2. Review the decisions.md for architectural context
3. Consult the API documentation in docs/api.md
4. Check Prisma logs: `npx prisma studio`
5. Review Next.js logs in the terminal

## Maintenance Commands

```bash
# View database
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (deletes all data!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Format Prisma schema
npx prisma format
```
