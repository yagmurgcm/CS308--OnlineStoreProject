# AI Coding Agent Instructions for FATIH-style Online Store

## Architecture Overview

This is a full-stack online store built with **NestJS** (backend) and **Next.js** (frontend) with MySQL database.

### Backend Stack (`backend/`)
- **Framework**: NestJS with TypeORM
- **Database**: MySQL (Railway-hosted)
- **Auth**: JWT with bcrypt password hashing
- **Module Structure**: Feature-based modules (auth, product, cart, order, reviews, users)

**Key Database Relationships**:
- **Product** → **ProductVariant** (1:many) - Variants store color, size, price, stock
- **User** → **Cart** → **CartItem** → **ProductVariant** (purchase flow)
- **User** → **Order** → **OrderDetail** (order completion)
- **User** → **Review** (product reviews per user)

### Frontend Stack (`frontend/`)
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS v4
- **State Management**: React Context (auth, cart, wishlist)
- **HTTP Client**: Custom `api.ts` utility with JWT token handling

---

## Critical Development Patterns

### Backend: Module Registration
All modules must be imported in `app.module.ts`. Each feature has a dedicated folder:
```typescript
// src/app.module.ts - Must include all modules
@Module({
  imports: [
    TypeOrmModule.forRootAsync({...}),
    ProductModule, CartModule, UsersModule, AuthModule, OrderModule, ReviewsModule
  ]
})
```

### Backend: Entity Registration
All TypeORM entities MUST be added to `src/config/database.config.ts`:
```typescript
const DEFAULT_ENTITIES = [
  Product, ProductVariant, User, AuthToken, Cart, CartItem, 
  LoginLog, Order, OrderDetail, Review
];
```

**Why**: Without this, TypeORM migrations and synchronization fail. Entity initialization is handled through the config, not auto-discovery.

### Cart Service: Variant Resolution Pattern
The cart uses complex variant lookup in `src/cart/cart.service.ts`. When adding items:
- **Input 1**: Direct `variantId` (fastest path)
- **Input 2**: `productId + color + size` (requires DB lookup)

```typescript
private async resolveVariantId(payload: {
  variantId?: number;
  productId?: number;
  color?: string;
  size?: string;
}): Promise<number>
```
This method includes extensive logging (`console.log`) for debugging cart operations.

### Authentication Flow
1. **Signup**: Hash password with bcrypt (10 rounds), create user, generate JWT
2. **Signin**: Verify password, generate JWT, log login time
3. **Logout**: Record logout time in LoginLog table
4. **JWT Payload**: `{ sub: userId, email }`

Frontend decodes JWT in `lib/auth-context.tsx` to extract user data without additional API call.

### Frontend: Context Patterns
**Three core contexts** (`lib/`):
1. **`auth-context.tsx`**: JWT token + user data (decode from token if needed)
2. **`cart-context.tsx`**: Cart items with variant details (color, size, price)
3. **`wishlistContext.tsx`**: Wishlist state management

**Context Usage Pattern**:
```tsx
const { user, logout } = useAuth(); // Always wrapped in Providers
const { items, addItem, removeItem } = useCart();
```

### API Request Pattern
All HTTP calls use `lib/api.ts`:
```typescript
api.get<T>(path)
api.post<T>(path, body?)
api.put<T>(path, body?)
api.delete<T>(path)
```

**Auto-handled**: Content-Type, Bearer token injection, error parsing
**Base URL**: `NEXT_PUBLIC_API_URL` env or `http://localhost:3001`

---

## Build & Run Commands

### Backend
```bash
cd backend
npm install
npm run start:dev        # Watch mode (primary dev)
npm run start:prod       # Production build
npm run test             # Unit tests
npm run test:e2e         # E2E tests
npm run lint --fix       # Fix ESLint issues
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # Dev server on :3000
npm run build            # Production build
npm run test             # Jest tests
```

### CORS Configuration
Backend enables CORS for `http://localhost:3000` (or `CORS_ORIGIN` env):
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
});
```

---

## Database Setup

### Seeding
Run `/backend/db/onlinestore-seed.sql` to populate products and variants.

### Key Entities
- **Product**: Name, category, subcategory, description, image
- **ProductVariant**: color, size, price, stock, product reference (composite unique index: product + color + size)
- **User**: Email (unique), hashed password, name
- **Cart**: User or guest token reference, cart items
- **Order**: User, total price, status (pending/completed), related order details

### Sample Data
- 21 Products across categories: Women, Men, Beauty
- 47 ProductVariants with color/size combinations
- Products have images from Unsplash/Pexels

---

## Common Modifications & Patterns

### Adding a New Entity
1. Create `src/<feature>/<entity>.entity.ts` with TypeORM decorators
2. Add to module's `TypeOrmModule.forFeature([...])`
3. **Register in `database.config.ts`** (critical!)
4. Run migrations if needed

### Adding a New API Endpoint
1. Create controller method with `@Get()`, `@Post()`, etc.
2. Controller decorators: `@Param()`, `@Body()`, `@Query()`
3. Use DTO for validation (class-validator + class-transformer)
4. Response is auto-serialized to JSON

### Frontend Components
- Use `"use client"` for client-side React hooks
- Components accessing contexts must be inside `<Providers>` wrapper
- Use conditional rendering for auth-protected components
- Cart item updates fetch from backend, not optimistic updates

---

## Debugging Tips

### Backend Logging
- Cart service includes detailed `console.log` statements for variant resolution
- Check terminal for "---" separator logs
- LoginLog table tracks all login/logout events

### Frontend Debugging
- Auth token stored in localStorage as `"token"`
- Cart context auto-retries failed requests
- Use `useCart().isLoading` to track API status

### Database Connection
- Configured via `database.config.ts`
- Railway MySQL: Port 39112 (non-standard)
- Check `getDatabaseConfig()` for connection string overrides

---

## Project Conventions

### File Structure
- **Controllers**: Handle HTTP layer, validation
- **Services**: Business logic, database queries
- **DTOs**: Input/output validation (lib: class-validator)
- **Entities**: TypeORM schema definitions
- **Contexts**: React state + localStorage persistence

### Naming
- Features in lowercase: `product`, `cart`, `auth`
- Controllers: `<feature>.controller.ts`
- Services: `<feature>.service.ts`
- Entities: `<entity>.entity.ts`
- DTOs: `<operation>.dto.ts` (e.g., `add-item.dto.ts`)

### Environment Variables
**Backend** (`.env`):
- `PORT` (default 3001)
- `CORS_ORIGIN` (default http://localhost:3000)
- Database credentials (via Railway or local .env)

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL` (default http://localhost:3001)
- Must be `NEXT_PUBLIC_*` to expose to browser

---

## Testing Approach

- Unit tests: Jest + @nestjs/testing (backend)
- E2E tests: Jest + supertest (backend)
- Frontend tests: Jest + @testing-library/react
- Run `npm run test` before committing

---

## Team Workflow
- Dynamic role assignment per sprint
- All members have basic project understanding
- Code changes require understanding of both entity relationships and API flow
- Default branch: `main` | Active branch: `online_db2`
