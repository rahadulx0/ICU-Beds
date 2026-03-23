# ICU Beds - Technical Documentation

> A full-stack real-time ICU bed availability tracker and emergency ambulance dispatch system for hospitals in Dhaka, Bangladesh.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Database Models](#6-database-models)
7. [API Reference](#7-api-reference)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Real-Time System (Socket.io)](#9-real-time-system-socketio)
10. [Server Middleware](#10-server-middleware)
11. [Server Utilities](#11-server-utilities)
12. [Frontend Architecture](#12-frontend-architecture)
13. [State Management (Redux)](#13-state-management-redux)
14. [Client Components](#14-client-components)
15. [Client Pages](#15-client-pages)
16. [Internationalization (i18n)](#16-internationalization-i18n)
17. [Dark Mode](#17-dark-mode)
18. [Map System](#18-map-system)
19. [Testing](#19-testing)
20. [Docker Deployment](#20-docker-deployment)
21. [Security](#21-security)
22. [Performance](#22-performance)
23. [Database Seeding](#23-database-seeding)
24. [Troubleshooting](#24-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (React)                      │
│  Vite + React 18 + Redux Toolkit + Tailwind CSS          │
│  Leaflet Maps | Recharts | Socket.io-client | i18next    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Auth     │  │ Hospital │  │ Ambulance │  │ Notif  │ │
│  │ Slice    │  │ Slice    │  │ Slice     │  │ Slice  │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘ │
└─────────────────┬───────────────────┬───────────────────┘
                  │ HTTP (Axios)       │ WebSocket
                  ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                     SERVER (Express)                     │
│  Node.js + Express 4 + Mongoose + Socket.io              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │ Routes   │  │Middleware │  │  Socket   │             │
│  │ (8)      │  │ (6)      │  │  Handlers │             │
│  └────┬─────┘  └──────────┘  └───────────┘             │
│       │                                                  │
│  ┌────▼─────┐  ┌──────────┐  ┌───────────┐             │
│  │ Models   │  │ Schemas  │  │ Utilities │             │
│  │ (7)      │  │ (Zod)    │  │ (4)       │             │
│  └────┬─────┘  └──────────┘  └───────────┘             │
└───────┼─────────────────────────────────────────────────┘
        │
   ┌────▼─────┐    ┌──────────┐
   │ MongoDB  │    │  Redis   │
   │ (Atlas)  │    │ (Cache)  │
   └──────────┘    └──────────┘
```

### Data Flow

1. **HTTP requests**: Client sends API calls via Axios to `/api/*` endpoints. In development, Vite proxies these to the Express server on port 5000.
2. **WebSocket events**: Socket.io maintains a persistent connection for real-time updates (bed counts, ambulance tracking, notifications).
3. **Authentication**: JWT stored in HTTP-only cookies. The server validates the cookie on every authenticated request.
4. **Caching**: Redis caches hospital lists (60s TTL). Falls back gracefully to no-cache if Redis is unavailable.
5. **Geospatial queries**: MongoDB `2dsphere` indexes enable `$near` queries for finding nearby hospitals and tracking ambulance positions.

---

## 2. Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express | 4.21 | HTTP framework |
| MongoDB | 7+ | Primary database |
| Mongoose | 8.7 | MongoDB ODM |
| Socket.io | 4.8 | Real-time WebSocket |
| ioredis | 5.4 | Redis client for caching |
| jsonwebtoken | 9.0 | JWT authentication |
| bcryptjs | 2.4 | Password hashing |
| zod | 3.23 | Request validation |
| helmet | 7.1 | Security headers |
| express-rate-limit | 7.4 | Rate limiting |
| nodemailer | 6.9 | Email service |
| winston | 3.14 | Structured logging |
| morgan | 1.10 | HTTP request logging |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool & dev server |
| Redux Toolkit | 2.3 | State management |
| React Router | 6.27 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Leaflet | 1.9 | Interactive maps |
| Recharts | 3.8 | Data visualization |
| Axios | 1.7 | HTTP client |
| Socket.io-client | 4.8 | WebSocket client |
| i18next | 25.10 | Internationalization |
| date-fns | 4.1 | Date formatting |
| lucide-react | 0.451 | Icon library |
| react-hot-toast | 2.4 | Toast notifications |

### Testing

| Technology | Purpose |
|---|---|
| Vitest 4.1 | Test runner (both client & server) |
| supertest 7.2 | HTTP assertion library |
| mongodb-memory-server 11.0 | In-memory MongoDB for tests |
| @testing-library/react 16.3 | React component testing |
| msw 2.12 | API mocking (Mock Service Worker) |
| jsdom 29.0 | DOM environment for tests |

### DevOps

| Technology | Purpose |
|---|---|
| Docker & Docker Compose | Containerized deployment |
| Nginx | Reverse proxy & static serving |

---

## 3. Project Structure

```
ICU Beds/
├── client/                          # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js             # Axios instance with interceptors
│   │   ├── components/
│   │   │   ├── AmbulanceTracker.jsx  # Real-time ambulance tracking widget
│   │   │   ├── BedHistoryChart.jsx   # Recharts line chart for bed trends
│   │   │   ├── ConfirmDialog.jsx     # Reusable confirmation modal
│   │   │   ├── ErrorBoundary.jsx     # React error boundary wrapper
│   │   │   ├── HospitalCard.jsx      # Hospital list item card
│   │   │   ├── Layout.jsx            # App shell (dark mode context + Navbar)
│   │   │   ├── LoadingSpinner.jsx    # Animated loading indicator
│   │   │   ├── Map.jsx               # Leaflet map with hospital markers
│   │   │   ├── Navbar.jsx            # Top nav + mobile bottom nav
│   │   │   ├── NotificationBell.jsx  # Notification dropdown with badge
│   │   │   ├── ProtectedRoute.jsx    # Auth + role guard for routes
│   │   │   ├── ReviewForm.jsx        # Star rating + comment form
│   │   │   ├── ReviewList.jsx        # Hospital reviews with pagination
│   │   │   ├── SOSButton.jsx         # Emergency SOS floating button
│   │   │   └── StatsCard.jsx         # Dashboard statistics card
│   │   ├── hooks/
│   │   │   └── useDarkMode.js        # Dark mode state with localStorage
│   │   ├── i18n/
│   │   │   ├── index.js              # i18next configuration
│   │   │   ├── en.json               # English translations
│   │   │   └── bn.json               # Bengali translations
│   │   ├── pages/
│   │   │   ├── AdminPanel.jsx        # Admin: manage hospitals & users
│   │   │   ├── AnalyticsDashboard.jsx # Charts for requests & utilization
│   │   │   ├── AuditLogs.jsx         # Admin: audit trail viewer
│   │   │   ├── Dashboard.jsx         # Role-based dashboard router
│   │   │   ├── DriverDashboard.jsx   # Driver: pending/active requests
│   │   │   ├── ForgotPassword.jsx    # Password reset request form
│   │   │   ├── Home.jsx              # Main map view with hospital list
│   │   │   ├── HospitalDetail.jsx    # Single hospital detail page
│   │   │   ├── HospitalManage.jsx    # Hospital rep: bed management
│   │   │   ├── Login.jsx             # Login form with validation
│   │   │   ├── ModeratorDashboard.jsx # Moderator: assigned hospitals
│   │   │   ├── NotFound.jsx          # 404 page
│   │   │   ├── Profile.jsx           # User profile editor
│   │   │   ├── RequestHistory.jsx    # Ambulance request history
│   │   │   ├── ResetPassword.jsx     # Password reset form (token)
│   │   │   ├── Signup.jsx            # Registration form
│   │   │   ├── UserDashboard.jsx     # User: requests + trip ratings
│   │   │   └── VerifyEmail.jsx       # Email verification handler
│   │   ├── store/
│   │   │   ├── index.js              # Redux store configuration
│   │   │   ├── authSlice.js          # Auth state & thunks
│   │   │   ├── hospitalSlice.js      # Hospital state & thunks
│   │   │   ├── ambulanceSlice.js     # Ambulance state & thunks
│   │   │   └── notificationSlice.js  # Notification state & thunks
│   │   ├── tests/
│   │   │   ├── setup.js              # Test environment setup
│   │   │   └── renderWith.jsx        # Test render helper (Provider wrap)
│   │   ├── utils/
│   │   │   └── exportCsv.js          # CSV export utility
│   │   ├── App.jsx                   # Root component with routes
│   │   ├── index.css                 # Tailwind + custom styles
│   │   ├── main.jsx                  # React entry point
│   │   └── socket.js                 # Socket.io client instance
│   ├── Dockerfile                    # Multi-stage build (Node + Nginx)
│   ├── nginx.conf                    # Production reverse proxy config
│   ├── index.html                    # HTML entry point
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js                # Vite + proxy + test config
│
├── server/                           # Express backend
│   ├── config/
│   │   ├── db.js                     # MongoDB connection with retry
│   │   ├── env.js                    # Environment variable validation
│   │   └── redis.js                  # Redis connection + cache helpers
│   ├── middleware/
│   │   ├── auth.js                   # JWT cookie authentication
│   │   ├── errorHandler.js           # Centralized error handler
│   │   ├── rateLimiter.js            # Rate limiting (Redis-backed)
│   │   ├── role.js                   # Role-based access control
│   │   ├── sanitize.js               # XSS + NoSQL injection prevention
│   │   └── validate.js               # Zod schema validation
│   ├── models/
│   │   ├── User.js                   # User with auth & geolocation
│   │   ├── Hospital.js               # Hospital with 2dsphere index
│   │   ├── AmbulanceRequest.js       # Ambulance dispatch tracking
│   │   ├── AuditLog.js               # Audit trail (90-day TTL)
│   │   ├── BedHistory.js             # Bed count snapshots (90-day TTL)
│   │   ├── Notification.js           # User notifications (90-day TTL)
│   │   └── Review.js                 # Hospital reviews & ratings
│   ├── routes/
│   │   ├── auth.js                   # Authentication endpoints
│   │   ├── hospitals.js              # Hospital CRUD & bed management
│   │   ├── users.js                  # User management
│   │   ├── ambulance.js              # Ambulance request lifecycle
│   │   ├── notifications.js          # Notification endpoints
│   │   ├── analytics.js              # Analytics & reporting
│   │   ├── audit.js                  # Audit log retrieval
│   │   └── reviews.js                # Hospital review endpoints
│   ├── schemas/
│   │   ├── auth.js                   # Register/login validation
│   │   ├── hospital.js               # Hospital CRUD validation
│   │   ├── ambulance.js              # Ambulance request validation
│   │   └── review.js                 # Review creation validation
│   ├── socket/
│   │   └── index.js                  # Socket.io event handlers
│   ├── utils/
│   │   ├── asyncHandler.js           # Async error wrapper for Express
│   │   ├── email.js                  # Nodemailer email service
│   │   ├── geo.js                    # Haversine distance & ETA calc
│   │   └── logger.js                 # Winston logger configuration
│   ├── tests/
│   │   ├── setup.js                  # mongodb-memory-server setup
│   │   ├── app.js                    # Test Express app factory
│   │   ├── auth.test.js              # Auth endpoint tests
│   │   ├── hospitals.test.js         # Hospital endpoint tests
│   │   ├── ambulance.test.js         # Ambulance lifecycle tests
│   │   └── notifications.test.js     # Notification endpoint tests
│   ├── .env.example                  # Environment variable template
│   ├── Dockerfile
│   ├── index.js                      # Server entry point
│   ├── package.json
│   ├── seed.js                       # Database seeding script
│   └── vitest.config.js
│
├── docker-compose.yml                # Full stack orchestration
└── .gitignore
```

---

## 4. Getting Started

### Prerequisites

- **Node.js** >= 20
- **MongoDB** (local or Atlas cluster)
- **Redis** (optional - the app works without it)
- **npm** >= 9

### Local Development

```bash
# 1. Clone the repository
git clone <repo-url>
cd "ICU Beds"

# 2. Install server dependencies
cd server
cp .env.example .env    # Edit .env with your MongoDB URI & JWT secret
npm install

# 3. Seed the database (creates test users & hospitals)
npm run seed

# 4. Start the server
npm run dev              # Starts on http://localhost:5000

# 5. In a new terminal, install client dependencies
cd ../client
npm install

# 6. Start the client
npm run dev              # Starts on http://localhost:5173
```

### Docker Deployment

```bash
# From the project root
docker compose up --build -d

# The app will be available at http://localhost
# MongoDB runs internally on port 27017
# Redis runs internally on port 6379
```

### Available Scripts

**Server** (`server/package.json`):

| Script | Command | Description |
|---|---|---|
| `npm start` | `node index.js` | Production start |
| `npm run dev` | `node --watch index.js` | Development with auto-restart |
| `npm run seed` | `node seed.js` | Seed database with test data |
| `npm test` | `vitest run` | Run all tests once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run test:coverage` | `vitest run --coverage` | Generate coverage report |

**Client** (`client/package.json`):

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Development server (port 5173) |
| `npm run build` | `vite build` | Production build to `dist/` |
| `npm run preview` | `vite preview` | Preview production build |
| `npm test` | `vitest run` | Run all tests once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run test:coverage` | `vitest run --coverage` | Generate coverage report |

---

## 5. Environment Variables

Create `server/.env` based on `server/.env.example`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `MONGO_URI` | **Yes** | - | MongoDB connection string |
| `JWT_SECRET` | **Yes** | - | JWT signing secret (min 32 chars recommended) |
| `CLIENT_URL` | Prod only | `http://localhost:5173` | Frontend URL for CORS & email links |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `SMTP_HOST` | No | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `SMTP_FROM` | No | `SMTP_USER` value | "From" address for emails |

**Notes:**
- If `REDIS_URL` is not set or Redis is unreachable, the server runs without caching. All cache operations silently fall back to no-ops.
- If `SMTP_*` variables are not set, email features (verification, password reset) are disabled. Registration and login still work - emails are skipped silently.
- `JWT_SECRET` shorter than 32 characters triggers a warning but still works.
- In production, `CLIENT_URL` is required (validated at startup).

---

## 6. Database Models

### 6.1 User

**Collection:** `users`

```javascript
{
  name:                String,     // required, max 100
  email:               String,     // required, unique, lowercase
  password:            String,     // required, min 6, bcrypt-hashed (select: false)
  phone:               String,     // optional
  role:                String,     // enum: 'admin' | 'moderator' | 'hospital_rep' | 'user' | 'driver'
                                   // default: 'user'
  assigned_hospitals:  [ObjectId], // ref: Hospital - which hospitals this user manages
  vehicle_details: {               // only for drivers
    plate_number:      String,
    vehicle_type:      String,     // enum: 'basic' | 'advanced' | 'icu_ambulance'
  },
  is_online:           Boolean,    // default: false - driver online status
  current_location: {              // GeoJSON Point - driver's live position
    type:              String,     // 'Point'
    coordinates:       [Number],   // [longitude, latitude]
  },
  is_active:           Boolean,    // default: true - account active/deactivated
  email_verified:      Boolean,    // default: false
  verification_token:  String,     // SHA256 hash of email verification token
  verification_expires:Date,       // 24-hour expiry
  reset_token:         String,     // SHA256 hash of password reset token
  reset_expires:       Date,       // 1-hour expiry
  push_subscriptions:  Array,      // Web push subscription objects
  createdAt:           Date,       // auto (timestamps)
  updatedAt:           Date,       // auto (timestamps)
}
```

**Indexes:** `current_location` (2dsphere), `role`

**Instance methods:**
- `comparePassword(candidatePassword)` - bcrypt comparison (used during login)

**Pre-save hook:** Automatically hashes `password` field with bcrypt (10 salt rounds) when modified.

### 6.2 Hospital

**Collection:** `hospitals`

```javascript
{
  name:               String,     // required, max 200
  address:            String,     // required
  location: {                     // GeoJSON Point
    type:             String,     // 'Point'
    coordinates:      [Number],   // [longitude, latitude]
  },
  total_icu_beds:     Number,     // required, min 0
  available_icu_beds: Number,     // required, min 0
  contact: {
    phone:            String,
    email:            String,
  },
  managed_by:         [ObjectId], // ref: User - assigned moderators/reps
  status:             String,     // enum: 'active' | 'inactive' | 'maintenance'
                                  // default: 'active'
  version:            Number,     // default: 0 - for Optimistic Concurrency Control
  createdAt:          Date,
  updatedAt:          Date,
}
```

**Indexes:** `location` (2dsphere), `status`, `available_icu_beds`

**Optimistic Concurrency Control (OCC):** The `version` field prevents lost updates when multiple users update bed counts simultaneously. Each bed update requires the current `version` in the request body. The update uses an atomic `findOneAndUpdate` with `{ version: expectedVersion }` in the filter and `{ $inc: { version: 1 } }`. If the versions don't match (another user updated first), a `409 Conflict` is returned with the current state.

### 6.3 AmbulanceRequest

**Collection:** `ambulancerequests`

```javascript
{
  patient:            ObjectId,   // ref: User - who requested
  driver:             ObjectId,   // ref: User - assigned driver (null until accepted)
  hospital:           ObjectId,   // ref: Hospital - destination
  pickup_location: {              // GeoJSON Point
    type:             String,
    coordinates:      [Number],   // [longitude, latitude]
  },
  pickup_address:     String,     // required, max 500
  status:             String,     // enum below, default: 'pending'
  emergency_type:     String,     // enum: 'critical' | 'moderate' | 'stable'
  notes:              String,     // max 500
  accepted_at:        Date,       // set when driver accepts
  completed_at:       Date,       // set when trip completes
  createdAt:          Date,
  updatedAt:          Date,
}
```

**Status State Machine:**

```
  pending ──▶ accepted ──▶ en-route ──▶ completed
     │            │            │
     │            ▼            │
     └─────▶ cancelled ◀──────┘
```

- `pending` → `accepted` (driver accepts)
- `accepted` → `en-route` (driver starts driving)
- `accepted` → `cancelled` (driver or patient cancels)
- `en-route` → `completed` (trip finished)
- `en-route` → `cancelled` (emergency cancel)
- `pending` → `cancelled` (patient cancels before acceptance)

**Constraints:** A user can only have one active request (pending/accepted/en-route) at a time.

### 6.4 AuditLog

**Collection:** `auditlogs`

```javascript
{
  actor:              ObjectId,   // ref: User - who performed the action
  action:             String,     // enum: see table below
  resource_type:      String,     // enum: 'hospital' | 'user' | 'ambulance_request'
  resource_id:        ObjectId,   // the affected document
  details:            Mixed,      // arbitrary context data
  ip_address:         String,     // request IP
  createdAt:          Date,       // TTL index: auto-deleted after 90 days
}
```

**Audit actions:**

| Action | Trigger |
|---|---|
| `hospital.create` | Admin creates a hospital |
| `hospital.update` | Admin/moderator updates hospital |
| `hospital.delete` | Admin deletes a hospital |
| `hospital.bed_update` | Bed count updated |
| `user.role_change` | Admin changes a user's role |
| `user.status_change` | Admin activates/deactivates a user |
| `ambulance.request` | User creates an ambulance request |
| `ambulance.accept` | Driver accepts a request |
| `ambulance.status_change` | Status transition |
| `ambulance.cancel` | Request cancelled |

### 6.5 BedHistory

**Collection:** `bedhistories`

```javascript
{
  hospital:           ObjectId,   // ref: Hospital
  available_icu_beds: Number,
  total_icu_beds:     Number,
  updated_by:         ObjectId,   // ref: User
  createdAt:          Date,       // TTL index: auto-deleted after 90 days
}
```

Used by the BedHistoryChart component to show bed availability trends over time.

### 6.6 Notification

**Collection:** `notifications`

```javascript
{
  user:               ObjectId,   // ref: User - notification recipient
  type:               String,     // enum: see table below
  title:              String,     // required, max 200
  message:            String,     // required, max 500
  data:               Mixed,      // arbitrary payload
  read:               Boolean,    // default: false
  createdAt:          Date,       // TTL index: auto-deleted after 90 days
}
```

**Notification types:**

| Type | Trigger |
|---|---|
| `request_status_change` | Ambulance request status changes |
| `new_ambulance_request` | New request for online drivers |
| `low_bed_alert` | Beds drop to 0 or below 20% capacity |
| `hospital_assignment` | User assigned to manage a hospital |
| `system` | System-wide announcements |
| `review` | New review on managed hospital |

### 6.7 Review

**Collection:** `reviews`

```javascript
{
  user:               ObjectId,   // ref: User - reviewer
  hospital:           ObjectId,   // ref: Hospital - reviewed hospital
  ambulance_request:  ObjectId,   // ref: AmbulanceRequest - unique (one review per trip)
  rating:             Number,     // 1-5
  comment:            String,     // max 1000, optional
  createdAt:          Date,
  updatedAt:          Date,
}
```

**Indexes:** `hospital + createdAt` (compound), `user`, `ambulance_request` (unique)

---

## 7. API Reference

Base URL: `/api`

All responses use JSON. Error responses follow the format:
```json
{ "message": "Error description" }
```

Validation errors return:
```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 7.1 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/register` | No | 20/15min | Register a new user |
| POST | `/login` | No | 20/15min | Login with email/password |
| POST | `/logout` | No | - | Clear auth cookie |
| GET | `/me` | Yes | - | Get current authenticated user |
| GET | `/verify-email/:token` | No | - | Verify email address |
| POST | `/resend-verification` | Yes | 20/15min | Resend verification email |
| POST | `/forgot-password` | No | 20/15min | Request password reset email |
| POST | `/reset-password/:token` | No | - | Reset password with token |

**POST /register**

```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+8801700000000",       // optional
  "role": "user",                   // 'user' or 'driver' only
  "vehicle_details": {              // required if role='driver'
    "plate_number": "DHA-1234",
    "vehicle_type": "advanced"      // 'basic' | 'advanced' | 'icu_ambulance'
  }
}

// Response 201
{
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phone": "+8801700000000",
    "email_verified": false,
    "is_online": false,
    "assigned_hospitals": [],
    "vehicle_details": null
  }
}
```

Sets an HTTP-only cookie `token` (7-day expiry).

**POST /login**

```json
// Request
{ "email": "john@example.com", "password": "password123" }

// Response 200: same shape as register response
// Response 401: { "message": "Invalid email or password" }
// Response 403: { "message": "Account has been deactivated" }
```

**POST /forgot-password**

Always returns the same message to prevent email enumeration:
```json
{ "message": "If that email is registered, a reset link has been sent" }
```

### 7.2 Hospitals (`/api/hospitals`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/` | No | - | List all active hospitals (cached 60s) |
| GET | `/nearby` | No | - | Geospatial search near coordinates |
| GET | `/:id` | No | - | Get hospital detail with staff info |
| POST | `/` | Yes | admin | Create a hospital |
| PUT | `/:id` | Yes | admin, moderator | Update hospital info |
| PATCH | `/:id/beds` | Yes | admin, moderator, hospital_rep | Update bed count (OCC) |
| DELETE | `/:id` | Yes | admin | Delete hospital |
| PUT | `/:id/assign` | Yes | admin | Assign user to hospital |
| PUT | `/:id/unassign` | Yes | admin | Unassign user from hospital |

**GET /nearby**

Query parameters:

| Param | Type | Default | Range | Description |
|---|---|---|---|---|
| `lng` | number | required | - | Longitude |
| `lat` | number | required | - | Latitude |
| `radius` | number | 10000 | 1000-100000 | Search radius in meters |
| `beds` | string | - | `'true'` | Filter to hospitals with available beds only |

Returns hospitals sorted by proximity (nearest first) using MongoDB `$near`.

**PATCH /:id/beds** (Optimistic Concurrency Control)

```json
// Request
{
  "available_icu_beds": 15,
  "version": 3                   // must match current version in DB
}

// Response 200: updated hospital object
// Response 409 (conflict):
{
  "message": "Conflict: data was modified by another user. Please refresh and try again.",
  "currentVersion": 4,
  "currentBeds": 12
}
```

Side effects:
- Invalidates Redis cache
- Records BedHistory entry
- Sends low-bed-alert notifications if beds <= 20% capacity
- Emits `bed-update` Socket.io event to all connected clients
- Creates audit log entry

### 7.3 Ambulance (`/api/ambulance`)

| Method | Endpoint | Auth | Roles | Rate Limit | Description |
|---|---|---|---|---|---|
| POST | `/request` | Yes | user, admin | 5/10min | Create ambulance request |
| GET | `/requests` | Yes | * | - | List requests (role-filtered) |
| GET | `/active` | Yes | * | - | Get current active request |
| GET | `/stats` | Yes | admin | - | Request statistics |
| PUT | `/:id/accept` | Yes | driver | - | Accept a pending request |
| PUT | `/:id/status` | Yes | driver, admin | - | Update request status |
| PUT | `/:id/cancel` | Yes | * | - | Cancel own request |

**POST /request**

```json
// Request
{
  "hospital": "hospital_id",
  "longitude": 90.3978,
  "latitude": 23.726,
  "pickup_address": "123 Main Street, Dhaka",
  "emergency_type": "critical",    // 'critical' | 'moderate' | 'stable'
  "notes": "Patient has chest pain"  // optional
}

// Response 201: populated request object
// Response 400: "You already have an active ambulance request"
```

Side effects: Notifies all online drivers via Socket.io and creates Notification records.

**GET /requests** (Role-based filtering)

| Role | Sees |
|---|---|
| user | Only their own requests |
| driver | Pending requests (all) + their assigned requests |
| admin | All requests |

Supports `?status=pending&page=1&limit=20` query parameters.

**PUT /:id/status**

```json
// Request
{ "status": "en-route" }

// Valid transitions:
// accepted → en-route, cancelled
// en-route → completed, cancelled
```

### 7.4 Users (`/api/users`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/` | Yes | admin | List all users (paginated) |
| GET | `/drivers` | Yes | * | List online drivers |
| GET | `/stats` | Yes | admin | User statistics by role |
| PUT | `/profile` | Yes | * | Update own profile |
| PUT | `/driver/status` | Yes | driver | Toggle online/offline |
| PUT | `/change-password` | Yes | * | Change password |
| PUT | `/:id/role` | Yes | admin | Change user role |
| PUT | `/:id/status` | Yes | admin | Activate/deactivate user |

### 7.5 Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List notifications (paginated, newest first) |
| GET | `/unread-count` | Yes | Get unread notification count |
| PUT | `/read-all` | Yes | Mark all as read |
| PUT | `/:id/read` | Yes | Mark single notification as read |
| DELETE | `/:id` | Yes | Delete own notification |

### 7.6 Analytics (`/api/analytics`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/bed-history/:hospitalId` | No | - | Bed history time series |
| GET | `/requests` | Yes | admin, moderator | Daily request counts |
| GET | `/response-time` | Yes | admin, moderator | Avg driver response time |
| GET | `/hospitals` | Yes | admin, moderator | Hospital bed utilization |

**GET /bed-history/:hospitalId**

Query: `?period=7d` (options: `24h`, `7d`, `30d`, `90d`)

Returns array of `{ available_icu_beds, total_icu_beds, createdAt }` entries.

### 7.7 Audit Logs (`/api/audit`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/` | Yes | admin | List audit logs (paginated, filtered) |

Query: `?page=1&limit=20&action=hospital.create&resource_type=hospital`

### 7.8 Reviews (`/api/reviews`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Create review for completed trip |
| GET | `/hospital/:hospitalId` | No | List reviews with avg rating |
| GET | `/my` | Yes | List own reviews |
| DELETE | `/:id` | Yes | Delete own review (admin can delete any) |

**POST /**

```json
// Request
{
  "hospital": "hospital_id",
  "ambulance_request": "request_id",
  "rating": 5,                    // 1-5
  "comment": "Great service"      // optional, max 1000 chars
}

// Response 201: populated review object
// Response 404: "Completed ambulance request not found"
// Response 409: "You have already reviewed this trip"
```

**GET /hospital/:hospitalId**

```json
// Response
{
  "reviews": [...],
  "avgRating": 4.3,
  "reviewCount": 15,
  "pagination": { "page": 1, "limit": 10, "total": 15, "pages": 2 }
}
```

### 7.9 Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | System health status |

```json
// Response 200 (healthy)
{
  "status": "ok",
  "timestamp": "2026-03-24T12:00:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "mongodb": "connected",
    "redis": "connected"         // or "unavailable"
  }
}

// Response 503 (degraded - MongoDB disconnected)
{ "status": "degraded", ... }
```

---

## 8. Authentication & Authorization

### Authentication Flow

1. **Registration/Login** → Server generates a JWT containing `{ id: user._id }` with 7-day expiry
2. **Cookie** → JWT is stored in an HTTP-only cookie named `token`
   - `secure: true` in production (HTTPS only)
   - `sameSite: 'none'` in production, `'lax'` in development
   - `maxAge: 7 days`
3. **Subsequent requests** → The `auth` middleware extracts the JWT from `req.cookies.token`, verifies it, and loads the user from MongoDB (excluding password)
4. **Client-side** → Axios sends `withCredentials: true` to include cookies automatically
5. **401 handling** → Axios response interceptor redirects to `/login` on 401

### Role-Based Access Control (RBAC)

Five roles with hierarchical permissions:

| Role | Description | Capabilities |
|---|---|---|
| `admin` | System administrator | Full access to everything |
| `moderator` | Regional moderator | Manage assigned hospitals, view analytics |
| `hospital_rep` | Hospital representative | Update bed counts for assigned hospitals |
| `driver` | Ambulance driver | Accept and manage ambulance requests |
| `user` | Regular user | Request ambulances, leave reviews |

The `checkRole` middleware enforces role restrictions:

```javascript
// server/middleware/role.js
router.put('/some-route', auth, checkRole(['admin', 'moderator']), handler);
```

On the client, `ProtectedRoute` wraps routes that require authentication or specific roles:

```jsx
// Requires any authenticated user
<ProtectedRoute><Dashboard /></ProtectedRoute>

// Requires admin or moderator
<ProtectedRoute roles={['admin', 'moderator']}><AnalyticsDashboard /></ProtectedRoute>
```

### Self-Registration Security

Users can only self-register as `user` or `driver`. The server explicitly rejects registration with `admin`, `moderator`, or `hospital_rep` roles even if sent in the request body (defense in depth — the Zod schema also restricts this).

---

## 9. Real-Time System (Socket.io)

### Connection Setup

**Client** (`client/src/socket.js`):
```javascript
const socket = io('/', {
  autoConnect: false,           // Manually connected in App.jsx
  withCredentials: true,        // Sends cookies for auth
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,      // 1s initial delay
  reconnectionDelayMax: 10000,  // 10s max delay
  timeout: 20000,               // 20s connection timeout
});
```

**Server** (`server/socket/index.js`):
- Authentication middleware extracts JWT from `socket.handshake.auth.token` or cookie
- Authenticated users join role rooms (`drivers` or `users`) and personal rooms (`user-{id}`)
- Unauthenticated connections join the `public` room (can receive bed updates)

### Rooms Architecture

| Room | Who Joins | Purpose |
|---|---|---|
| `drivers` | All authenticated drivers | Broadcast new ambulance requests |
| `users` | All authenticated non-drivers | General user events |
| `user-{userId}` | Individual user | Personal notifications |
| `ambulance-{requestId}` | Patient + driver + admin | Ambulance tracking |
| `public` | Unauthenticated users | Public bed updates |

### Events

#### Server → Client

| Event | Room | Payload | Trigger |
|---|---|---|---|
| `bed-update` | All (broadcast) | `{ hospitalId, available_icu_beds, total_icu_beds, version }` | Bed count updated |
| `notification` | `user-{id}` | `{ type, title, message }` | Any notification |
| `new-request` | `drivers` | Full request object | New ambulance request created |
| `request-taken` | `drivers` | `{ requestId }` | Driver accepted a request |
| `request-accepted` | All | `{ request, roomId }` | Request accepted |
| `request-cancelled` | `ambulance-{id}` + `drivers` | `{ requestId }` | Request cancelled |
| `status-update` | `ambulance-{id}` | `{ requestId, status }` | Status transition |
| `driver-location-update` | `ambulance-{id}` | `{ requestId, driverId, latitude, longitude, eta, timestamp }` | Driver location update |

#### Client → Server

| Event | Payload | Handler |
|---|---|---|
| `driver-location` | `{ latitude, longitude, requestId }` | Updates driver location in DB + emits to tracking room (rate limited: 1/sec) |
| `join-tracking` | `requestId` | Joins `ambulance-{requestId}` room (validates participant) |
| `leave-tracking` | `requestId` | Leaves tracking room |

### ETA Calculation

When a driver sends `driver-location`, the server:
1. Updates the driver's `current_location` in the database
2. If a `requestId` is provided, looks up the ambulance request
3. Calculates ETA using the Haversine formula (`server/utils/geo.js`):
   - `toPickup`: Distance from driver to patient
   - `toHospital`: Distance from patient to hospital (or driver to hospital if en-route)
   - Default assumptions: 30 km/h average speed, 1.3x road factor for Dhaka

### Driver Lifecycle

```
Socket connect → User.is_online = true → join 'drivers' room
                     │
                     ├── Listen for 'driver-location' events
                     ├── Accept request → join 'ambulance-{id}' room
                     │
Socket disconnect → User.is_online = false
```

---

## 10. Server Middleware

### 10.1 `auth.js` - JWT Authentication

Extracts JWT from `req.cookies.token`, verifies it with `JWT_SECRET`, loads the user from MongoDB. Rejects with:
- `401 "Not authenticated"` if no token
- `401 "Token expired"` if JWT expired
- `401 "Invalid token"` for any other verification failure
- `401 "User not found"` if user was deleted
- `403 "Account deactivated"` if `is_active === false`

### 10.2 `errorHandler.js` - Centralized Error Handling

Catches all errors from route handlers and converts them to JSON responses:

| Error Type | Status | Response |
|---|---|---|
| `ValidationError` (Mongoose) | 400 | Concatenated validation messages |
| Duplicate key (code 11000) | 409 | "Duplicate value for {field}" |
| `CastError` | 400 | "Invalid ID format" |
| Other errors | 500 | "Internal server error" (production) or actual message (development) |

### 10.3 `rateLimiter.js` - Rate Limiting

Three tiers of rate limiting:

| Limiter | Scope | Window | Max Requests |
|---|---|---|---|
| `authLimiter` | Auth routes | 15 minutes | 20 |
| `ambulanceLimiter` | Ambulance creation | 10 minutes | 5 |
| `apiLimiter` | All `/api/*` routes | 15 minutes | 100 |

Features:
- Uses Redis as a distributed store when available (falls back to in-memory)
- Dynamically switches between Redis and in-memory when Redis state changes
- **Completely bypassed in test environment** to avoid interfering with test assertions
- Returns `{ "message": "Too many attempts..." }` when limit exceeded

### 10.4 `role.js` - Role-Based Access Control

Factory function that creates middleware accepting an array of allowed roles:

```javascript
const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
```

### 10.5 `sanitize.js` - Input Sanitization

Two layers of protection:
1. **`mongoSanitize()`** - Strips MongoDB operators (`$gt`, `$ne`, etc.) from request body/query/params to prevent NoSQL injection
2. **`sanitizeBody`** - Recursively escapes HTML entities in all string values (`<`, `>`, `"`, `'`, `&`) to prevent XSS

### 10.6 `validate.js` - Zod Schema Validation

Generic validation middleware factory:

```javascript
validate(schema, source = 'body')
```

- `source` can be `'body'`, `'query'`, or `'params'`
- On success: attaches parsed data to `req.validatedBody`, `req.validatedQuery`, or `req.validatedParams`
- On failure: returns 400 with `{ message: "Validation failed", errors: [...] }`

---

## 11. Server Utilities

### 11.1 `asyncHandler.js`

Wraps async route handlers to automatically catch rejected promises and forward to the error handler:

```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

All route handlers use this to avoid try/catch boilerplate.

### 11.2 `logger.js` - Winston Logger

```
logs/
├── error.log       # Error-level messages only
└── combined.log    # All messages (info + warn + error)
```

- Console transport in development (colored output)
- JSON format with timestamps
- Service metadata: `{ service: 'icu-beds-api' }`

### 11.3 `email.js` - Email Service

Provides four functions:

| Function | Purpose |
|---|---|
| `initializeEmail()` | Creates nodemailer transport from SMTP env vars |
| `sendEmail({ to, subject, html })` | Sends arbitrary email |
| `sendVerificationEmail(email, token)` | Sends email verification link (24h expiry) |
| `sendPasswordResetEmail(email, token)` | Sends password reset link (1h expiry) |

All email operations are non-blocking (errors are logged, not thrown). If SMTP is not configured, emails are silently skipped.

### 11.4 `geo.js` - Geospatial Utilities

| Function | Description |
|---|---|
| `haversineDistance(lat1, lon1, lat2, lon2)` | Great-circle distance in km |
| `calculateETA(lat1, lon1, lat2, lon2, speed?, roadFactor?)` | Returns `{ distanceKm, etaMinutes }` |

ETA defaults: 30 km/h average speed (for Dhaka traffic), 1.3x road factor multiplier.

---

## 12. Frontend Architecture

### Entry Point Flow

```
main.jsx
  └── <Provider store={store}>         (Redux)
        └── <BrowserRouter>             (React Router)
              └── <App />
                    ├── checkAuth()     (verify JWT cookie on mount)
                    ├── socket.connect() (Socket.io)
                    └── <Layout>
                          ├── <Navbar />
                          └── <Routes>  (lazy-loaded pages)
```

### Code Splitting

All page components are lazy-loaded using `React.lazy()` and wrapped in `<Suspense>`:

```javascript
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
// ... 13 more lazy imports
```

The Vite build config splits dependencies into named chunks:

| Chunk | Contents | Size (gzip) |
|---|---|---|
| `vendor` | react, react-dom, react-router-dom | ~51 KB |
| `redux` | @reduxjs/toolkit, react-redux | ~15 KB |
| `map` | leaflet, react-leaflet | ~45 KB |
| `charts` | recharts | ~101 KB |
| `index` | App code + remaining deps | ~66 KB |

### Axios Configuration

```javascript
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
```

- `withCredentials: true` ensures cookies are sent with every request
- Response interceptor redirects to `/login` on any 401 response
- In development, Vite proxies `/api` and `/socket.io` to `http://localhost:5000`

---

## 13. State Management (Redux)

The Redux store has four slices:

```javascript
// store/index.js
configureStore({
  reducer: {
    auth: authReducer,
    hospitals: hospitalReducer,
    ambulance: ambulanceReducer,
    notifications: notificationReducer,
  },
});
```

### 13.1 `authSlice`

**State:**
```javascript
{
  user: null | UserObject,
  loading: boolean,
  error: null | string,
}
```

**Async Thunks:**

| Thunk | API Call | Purpose |
|---|---|---|
| `login(credentials)` | POST `/auth/login` | Sign in |
| `register(userData)` | POST `/auth/register` | Create account |
| `logout()` | POST `/auth/logout` | Sign out (clears cookie) |
| `checkAuth()` | GET `/auth/me` | Verify existing cookie on app load |
| `updateProfile(updates)` | PUT `/users/profile` | Update name/phone/etc. |
| `toggleDriverOnline(is_online)` | PUT `/users/driver/status` | Toggle driver availability |
| `changePassword(data)` | PUT `/users/change-password` | Change password |

### 13.2 `hospitalSlice`

**State:**
```javascript
{
  list: Hospital[],
  selected: null | Hospital,
  loading: boolean,
  error: null | string,
  filter: 'all' | 'available' | 'critical',
}
```

**Async Thunks:**

| Thunk | API Call |
|---|---|
| `fetchHospitals()` | GET `/hospitals` |
| `fetchNearbyHospitals(params)` | GET `/hospitals/nearby` |
| `createHospital(data)` | POST `/hospitals` |
| `updateHospital({ id, updates })` | PUT `/hospitals/{id}` |
| `updateBeds({ id, available_icu_beds, version })` | PATCH `/hospitals/{id}/beds` |
| `deleteHospital(id)` | DELETE `/hospitals/{id}` |

**Sync Reducers:**

| Reducer | Purpose |
|---|---|
| `setFilter(filter)` | Set hospital list filter |
| `setSelected(hospital)` | Set selected hospital on map |
| `updateBedCount(data)` | Handle real-time bed-update Socket.io event |

### 13.3 `ambulanceSlice`

**State:**
```javascript
{
  requests: AmbulanceRequest[],
  activeRequest: null | AmbulanceRequest,
  driverLocation: null | { latitude, longitude, eta },
  loading: boolean,
  error: null | string,
  pagination: null | { page, limit, total, pages },
}
```

**Async Thunks:**

| Thunk | API Call |
|---|---|
| `createRequest(data)` | POST `/ambulance/request` |
| `fetchRequests(params)` | GET `/ambulance/requests` |
| `fetchActiveRequest()` | GET `/ambulance/active` |
| `acceptRequest(id)` | PUT `/ambulance/{id}/accept` |
| `updateRequestStatus({ id, status })` | PUT `/ambulance/{id}/status` |
| `cancelRequest(id)` | PUT `/ambulance/{id}/cancel` |

### 13.4 `notificationSlice`

**State:**
```javascript
{
  list: Notification[],
  unreadCount: number,
  loading: boolean,
  pagination: null | { page, limit, total, pages },
}
```

**Async Thunks:**

| Thunk | API Call |
|---|---|
| `fetchNotifications({ page })` | GET `/notifications` |
| `fetchUnreadCount()` | GET `/notifications/unread-count` |
| `markAsRead(id)` | PUT `/notifications/{id}/read` |
| `markAllAsRead()` | PUT `/notifications/read-all` |

**Sync Reducers:**

| Reducer | Purpose |
|---|---|
| `addNotification(notification)` | Prepend from Socket.io event + increment unread count |

---

## 14. Client Components

### Core Layout Components

| Component | Description |
|---|---|
| **Layout** | App shell. Provides `DarkModeContext`. Renders `Navbar` + main content area. Includes skip-to-content accessibility link. |
| **Navbar** | Desktop top nav + mobile bottom tab bar. Role-based menu items. Theme toggle, language toggle, NotificationBell. |
| **ProtectedRoute** | Wrapper that checks `user` in Redux. Optionally validates `roles` array. Redirects to `/login` if unauthenticated. |
| **ErrorBoundary** | React error boundary. Catches rendering errors and displays fallback UI. |

### UI Components

| Component | Props | Description |
|---|---|---|
| **LoadingSpinner** | `fullScreen?: boolean` | Centered spinning animation. Full viewport when `fullScreen` is true. |
| **StatsCard** | `title, value, icon, trend?` | Dashboard card with title, large value, icon, optional trend indicator. |
| **ConfirmDialog** | `isOpen, title, message, confirmText, cancelText, variant, onConfirm, onCancel, loading` | Modal dialog with danger/warning/info variants. |
| **HospitalCard** | `hospital, compact?, onSelect?, onRequestAmbulance?` | Hospital list item with name, beds, status badge, action buttons. |
| **NotificationBell** | - | Icon button with unread count badge. Opens dropdown showing latest notifications. |

### Feature Components

| Component | Description |
|---|---|
| **Map** | Leaflet map rendering. Hospital markers with color-coded circles (green/amber/red by bed availability). User location marker. Click-to-select. Admin right-click to add hospital. |
| **AmbulanceTracker** | Shows active ambulance request status. Displays driver info, real-time ETA, status transitions. Subscribes to Socket.io tracking room. |
| **BedHistoryChart** | Recharts area chart showing bed availability trends. Period selector (24h/7d/30d/90d). |
| **ReviewForm** | Star rating (1-5, hover effect) + comment textarea. Submits review for a completed trip. |
| **ReviewList** | Fetches and displays paginated reviews for a hospital. Shows average rating and review count. |
| **SOSButton** | Floating emergency button (bottom-right). Gets GPS, finds nearest hospital with beds, creates critical ambulance request after confirmation. Pulsing red animation. |

---

## 15. Client Pages

### Public Pages

| Page | Route | Description |
|---|---|---|
| **Home** | `/` | Main view. Split layout: hospital list sidebar + interactive map. Search, filters, ambulance request modal. Admin can add hospitals by right-clicking the map. |
| **Login** | `/login` | Email/password form with inline validation (email format, password length). ARIA accessibility attributes. |
| **Signup** | `/signup` | Registration form with user/driver toggle. Driver fields (plate number, vehicle type) shown conditionally. Inline validation. |
| **ForgotPassword** | `/forgot-password` | Email input to request password reset. |
| **ResetPassword** | `/reset-password/:token` | New password form using reset token from email. |
| **VerifyEmail** | `/verify-email/:token` | Calls verification endpoint on mount. Shows success/error. |
| **HospitalDetail** | `/hospitals/:id` | Full hospital info: map, bed utilization bar, bed history chart, contact info, assigned staff, reviews. |
| **NotFound** | `*` | 404 page with link back to home. |

### Protected Pages (any authenticated user)

| Page | Route | Description |
|---|---|---|
| **Dashboard** | `/dashboard` | Role-based dashboard router. Renders AdminPanel, ModeratorDashboard, HospitalManage, DriverDashboard, or UserDashboard depending on `user.role`. |
| **Profile** | `/profile` | Edit name, email, phone. Change password form. |
| **RequestHistory** | `/history` | Full ambulance request history with status filters and pagination. |

### Role-Specific Pages

| Page | Route | Roles | Description |
|---|---|---|---|
| **AdminPanel** | (via Dashboard) | admin | Full hospital CRUD table, user management table, CSV export for both. Assign/unassign staff to hospitals. |
| **ModeratorDashboard** | (via Dashboard) | moderator | Assigned hospitals with bed management. |
| **HospitalManage** | (via Dashboard) | hospital_rep | Manage bed counts for assigned hospital with OCC. |
| **DriverDashboard** | (via Dashboard) | driver | Pending requests to accept, active request management with status transitions. |
| **UserDashboard** | (via Dashboard) | user | Active request tracker, request history with "Rate Trip" button for completed requests. |
| **AnalyticsDashboard** | `/analytics` | admin, moderator | Request trends chart, response time stats, hospital utilization chart. Period selector (7d/30d/90d). |
| **AuditLogs** | `/audit-logs` | admin | Filterable, paginated audit trail. Desktop table + mobile card layout. |

---

## 16. Internationalization (i18n)

The app supports **English** and **Bengali** (Bangla) using i18next.

### Configuration

```javascript
// client/src/i18n/index.js
i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  fallbackLng: 'en',
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
});
```

**Detection order:**
1. Check `localStorage` for saved preference
2. Fall back to browser navigator language
3. Default to English

### Usage in Components

```jsx
const { t, i18n } = useTranslation();

// Translate text
<p>{t('nav.dashboard')}</p>

// Toggle language
i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn');
```

### Translation Structure

Both `en.json` and `bn.json` share the same key structure:

```json
{
  "app": { "name": "ICU Beds", "tagline": "..." },
  "nav": { "map": "Map", "dashboard": "Dashboard", ... },
  "home": { "searchPlaceholder": "...", "filter": "Filter", ... },
  "auth": { "loginTitle": "...", "emailLabel": "...", ... },
  "ambulance": { "requestAmbulance": "...", "emergencyType": "...", ... },
  "dashboard": { "title": "...", ... },
  "common": { "cancel": "Cancel", "save": "Save", ... },
  "validation": { "required": "...", "invalidEmail": "...", ... }
}
```

The language toggle button in the Navbar switches between English and Bengali.

---

## 17. Dark Mode

### Implementation

Dark mode uses Tailwind CSS's `class` strategy (not `media`):

```javascript
// tailwind.config.js
module.exports = { darkMode: 'class', ... }
```

**Toggle mechanism:**
1. `useDarkMode()` hook reads initial state from `localStorage('theme')` or system preference
2. `Layout.jsx` creates `DarkModeContext` and adds/removes `dark` class on `<html>`
3. All components use `dark:` Tailwind variants: `bg-white dark:bg-gray-900`

### Dark Mode Map Fix

The map uses OpenStreetMap tiles (colorful). In dark mode, a CSS filter on `.leaflet-tile-pane` creates a colorful dark palette without affecting markers or popups:

```css
.dark .leaflet-tile-pane {
  filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
}
```

This works because map markers, popups, and controls live in sibling panes (`.leaflet-marker-pane`, `.leaflet-popup-pane`) which are not affected by the filter.

---

## 18. Map System

### Technology

- **Leaflet 1.9** via **react-leaflet 4.2**
- Tile provider: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)

### Hospital Markers

Hospitals are rendered as circular markers with colors based on bed availability:

| Condition | Color | Label |
|---|---|---|
| `available_icu_beds > 20%` of total | Emerald (green) | Available |
| `available_icu_beds > 0 && <= 20%` | Amber (yellow) | Low |
| `available_icu_beds === 0` | Red | No Beds |

Each marker has a popup showing:
- Hospital name and address
- Bed count: "X / Y ICU Beds"
- "View Details" link to `/hospitals/:id`
- "Request Ambulance" button (for user role)

### User Location

When the user clicks "My Location", the browser's Geolocation API is used. The user's position appears as a blue pulsing dot.

### Admin: Add Hospital

Admin users can right-click the map to add a hospital. The coordinates are captured, reverse-geocoded via Nominatim API to pre-fill the name and address, and a modal form is shown.

### Map Viewport

Default center: Dhaka, Bangladesh `[23.777, 90.399]`, zoom level 12.

---

## 19. Testing

### Server Tests

**Framework:** Vitest + Supertest + mongodb-memory-server

**Setup** (`server/tests/setup.js`):
- Starts an in-memory MongoDB instance before all tests
- Connects Mongoose before each test file
- Drops all collections after each test
- Disconnects and stops the server after all tests

**Test app** (`server/tests/app.js`):
- Creates a minimal Express app with routes but no Socket.io, rate limiting, or Redis
- Mocks the `io` object for socket emissions

**Test files:**

| File | Tests | Coverage |
|---|---|---|
| `auth.test.js` | ~10 | Register, login, JWT cookie, duplicate email, validation |
| `hospitals.test.js` | ~10 | CRUD, bed update OCC, geospatial search, role restrictions |
| `ambulance.test.js` | 13 | Full request lifecycle, state transitions, role restrictions |
| `notifications.test.js` | 9 | CRUD, read/unread, user isolation |

**Running:**
```bash
cd server
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

### Client Tests

**Framework:** Vitest + @testing-library/react + jsdom + MSW

**Setup** (`client/src/tests/setup.js`):
- Imports `@testing-library/jest-dom` for DOM assertions
- Sets up MSW for API mocking

**Helper** (`client/src/tests/renderWith.jsx`):
- Wraps components in Redux Provider + BrowserRouter for testing

**Test files:**

| File | Tests | Coverage |
|---|---|---|
| `ConfirmDialog.test.jsx` | ~3 | Open/close, confirm/cancel callbacks |
| `HospitalCard.test.jsx` | 11 | Rendering, bed badges, click handlers, compact mode |
| `LoadingSpinner.test.jsx` | ~3 | Default + fullScreen rendering |
| `Navbar.test.jsx` | 5 | Auth/unauth states, role-based links |
| `StatsCard.test.jsx` | ~3 | Rendering with trends |
| `NotFound.test.jsx` | ~3 | 404 page rendering |

**Running:**
```bash
cd client
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

---

## 20. Docker Deployment

### Architecture

```yaml
# docker-compose.yml
services:
  mongo:    # MongoDB 7 on port 27017
  redis:    # Redis 7 on port 6379
  server:   # Express on port 5000
  client:   # Nginx on port 80
```

### Server Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
```

### Client Dockerfile

Multi-stage build:

1. **Build stage**: `node:20-alpine` → `npm ci` + `npm run build` → produces `dist/`
2. **Production stage**: `nginx:alpine` → copies `dist/` + `nginx.conf`

### Nginx Configuration

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://server:5000;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://server:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

### Deployment Commands

```bash
# Start all services
docker compose up --build -d

# View logs
docker compose logs -f server

# Stop all services
docker compose down

# Reset data (removes MongoDB volume)
docker compose down -v
```

### Environment Variables in Docker

Set `JWT_SECRET` before deploying:

```bash
JWT_SECRET=your-production-secret docker compose up --build -d
```

Or create a `.env` file in the project root:

```
JWT_SECRET=your-production-secret-minimum-32-characters
```

---

## 21. Security

### Authentication Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt with 10 salt rounds |
| JWT in HTTP-only cookies | Cannot be accessed by JavaScript (prevents XSS token theft) |
| Secure cookie in production | `secure: true, sameSite: 'none'` |
| Token expiry | 7-day JWT lifetime |
| Token verification | SHA256 hashing for email/reset tokens |
| Email enumeration prevention | Forgot-password always returns same message |

### Input Security

| Measure | Implementation |
|---|---|
| Request validation | Zod schemas on all mutation endpoints |
| NoSQL injection prevention | `express-mongo-sanitize` strips `$` and `.` operators |
| XSS prevention | HTML entity escaping on all string inputs (`sanitizeBody`) |
| Body size limit | `express.json({ limit: '10kb' })` |
| Payload size | Zod schemas enforce max lengths on strings |

### HTTP Security

| Measure | Implementation |
|---|---|
| Security headers | Helmet.js (CSP, X-Frame-Options, HSTS, etc.) |
| Content Security Policy | Whitelisted: self, OpenStreetMap tiles, Nominatim API, fonts |
| CORS | Restricted to `CLIENT_URL` with credentials |
| Rate limiting | Auth (20/15min), ambulance (5/10min), API (100/15min) |

### Access Control

| Measure | Implementation |
|---|---|
| Role-based access | `checkRole` middleware on protected routes |
| Hospital assignment checks | Moderators/reps can only manage assigned hospitals |
| Request ownership | Users can only cancel/view their own requests |
| Notification isolation | Users can only read/delete their own notifications |
| Self-registration restriction | Can only register as `user` or `driver` |

### Data Protection

| Measure | Implementation |
|---|---|
| Password not returned | `select: false` on password field |
| Audit trail | All admin actions logged with actor, IP, timestamp |
| TTL indexes | Audit logs, notifications, bed history auto-delete after 90 days |

---

## 22. Performance

### Caching (Redis)

| Key Pattern | TTL | Invalidation |
|---|---|---|
| `hospitals:active:all` | 60s | On any hospital create/update/delete/bed-change |

Redis is optional. When unavailable:
- `cacheGet()` returns `null`
- `cacheSet()` and `cacheInvalidate()` are no-ops
- Server logs a warning once at startup and continues

### Database Optimization

| Optimization | Details |
|---|---|
| Geospatial indexes | `2dsphere` on Hospital.location, User.current_location, AmbulanceRequest.pickup_location |
| Compound indexes | Notification: `{ user, read, createdAt }` |
| TTL indexes | AuditLog, BedHistory, Notification: auto-delete after 90 days |
| Lean queries | `.lean()` on read-only queries (returns plain objects, skips Mongoose hydration) |
| Selective population | `.populate('user', 'name')` - only loads needed fields |
| Pagination | All list endpoints support `page` and `limit` parameters |

### Frontend Optimization

| Optimization | Details |
|---|---|
| Code splitting | `React.lazy()` for all 13 page components |
| Manual chunks | Vendor, Redux, Map, Charts split into separate bundles |
| Suspense boundaries | Loading spinner while chunks download |
| Optimistic updates | `updateBedCount` reducer applies Socket.io updates immediately |
| Debounced socket | Driver location updates rate-limited to 1/second |
| CSS filter for dark map | Avoids loading separate dark tile set |

### Build Output

The production build produces optimized chunks:

| Chunk | Size (gzip) |
|---|---|
| CSS bundle | ~14 KB |
| Vendor (React core) | ~51 KB |
| Redux | ~15 KB |
| Map (Leaflet) | ~45 KB |
| Charts (Recharts) | ~101 KB |
| App code | ~66 KB |
| Individual pages | 0.5-10 KB each |

---

## 23. Database Seeding

Run `npm run seed` in the `server/` directory to populate the database with test data.

**WARNING:** This clears ALL existing users and hospitals.

### Seed Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@icubeds.com` | `admin123` |
| Moderator | `moderator@icubeds.com` | `mod123` |
| Hospital Rep | `rep@icubeds.com` | `rep123` |
| Driver | `driver@icubeds.com` | `driver123` |
| User | `user@icubeds.com` | `user123` |

### Seed Hospitals (8 in Dhaka, Bangladesh)

| Hospital | Total Beds | Available | Assigned Staff |
|---|---|---|---|
| Dhaka Medical College Hospital | 50 | 12 | Rep, Moderator |
| Square Hospital | 30 | 8 | Moderator |
| United Hospital | 40 | 0 | Moderator |
| Evercare Hospital Dhaka | 35 | 15 | - |
| Labaid Specialized Hospital | 25 | 3 | - |
| Ibn Sina Hospital | 20 | 7 | - |
| National Heart Foundation | 45 | 20 | - |
| BIRDEM General Hospital | 30 | 5 | - |

---

## 24. Troubleshooting

### Server won't start

**`EADDRINUSE: address already in use :::5000`**
Another process is using port 5000. Kill it:
```bash
npx kill-port 5000
```

**`Missing required environment variables: MONGO_URI`**
Create `server/.env` from `.env.example` and fill in your MongoDB connection string.

**`[ioredis] Unhandled error event: ECONNREFUSED`**
Redis is not running. This is non-fatal — the server works without Redis. The error handler prevents crashes, but you'll see warning logs. To silence: either start Redis or remove `REDIS_URL` from `.env`.

### MongoDB connection fails

**`MongoDB connection attempt X/5 failed`**
- Check your `MONGO_URI` in `.env`
- If using Atlas: ensure your IP is whitelisted in Network Access
- The server retries 5 times with exponential backoff before exiting

### Tests failing

**Rate limiter errors in tests**
The rate limiter is automatically bypassed when `NODE_ENV=test`. Ensure your test setup doesn't override this.

**`Duplicate key error` in tests**
Tests should drop collections between test files. Check `server/tests/setup.js` is properly configured.

### Client build errors

**`Module not found`**
Run `npm install` in the `client/` directory.

**Vite proxy not working**
Ensure the server is running on port 5000 before starting the client dev server.

### Socket.io not connecting

- Check that the server is running and accessible
- In development, Vite proxies `/socket.io` to `localhost:5000`
- In production, Nginx handles the WebSocket upgrade
- Check browser console for connection errors

### Dark mode map looks wrong

The CSS filter approach requires `.leaflet-tile-pane` to exist in the DOM. If the map renders before the filter is applied, force a re-render by toggling dark mode off and on.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `cd server && npm test` and `cd client && npm test`
5. Build: `cd client && npm run build`
6. Commit and push
7. Open a pull request

### Code Conventions

- **Server**: CommonJS modules (`require`/`module.exports`)
- **Client**: ES modules (`import`/`export`)
- **Naming**: camelCase for functions/variables, PascalCase for React components, snake_case for MongoDB fields
- **Formatting**: 2-space indentation, single quotes, trailing commas
- **Error handling**: Use `asyncHandler` wrapper, never swallow errors silently in routes
- **Validation**: All request inputs validated with Zod schemas before processing
