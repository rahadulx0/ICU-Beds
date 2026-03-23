## Project Specification: ICU & Emergency Care System

### Core Objective
Build a high-availability web platform to monitor real-time ICU bed availability and provide an integrated emergency ambulance dispatch system with live GPS tracking.

### Tech Stack
* **Frontend:** React.js (Vite), Tailwind CSS, Redux Toolkit (for global state and auth).
* **Backend:** Node.js, Express.js (RESTful API).
* **Database:** MongoDB Atlas (NoSQL for flexible hospital and user schemas).
* **Real-time Communication:** Socket.io (essential for live ambulance tracking and instant bed updates).
* **Authentication:** JWT (JSON Web Tokens) stored in HTTP-only cookies.

---

### Expanded Role-Based Access Control (RBAC)

| Role | Responsibility | Access Scope |
| :--- | :--- | :--- |
| **Admin** | System Overseer | Full CRUD on users, hospitals, and system logs. |
| **Moderator** | Regional Manager | Manage a group of hospitals assigned by the Admin. |
| **Hospital Rep** | Facility Operator | Update `available_beds` and status for one specific hospital. |
| **Regular User** | Patient/Public | View map, search beds, and request/track ambulances. |
| **Ambulance Driver** | Service Provider | Accept/Reject requests; transmit live GPS coordinates. |

---

### Data Models (MongoDB)

**1. User Schema**
Includes `role` and `assigned_hospitals` (Array of ObjectIds) to facilitate the Moderator and Rep logic. Drivers include a `vehicle_details` object and `is_online` status.

**2. Hospital Schema**
Uses **GeoJSON** for location-based queries.
```javascript
{
  name: String,
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] }, // [Long, Lat]
  total_icu_beds: Number,
  available_icu_beds: Number,
  managed_by: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Reps & Moderators
  contact: String
}
```

**3. Ambulance Request Schema**
Tracks the lifecycle of an emergency request: `pending` → `accepted` → `en-route` → `completed`.

---

### Production-Grade Features

#### 1. Real-time Live Tracking (Socket.io)
When a driver accepts a request, a private Socket room is created between the User and the Driver. The driver's frontend emits coordinates every 3 seconds, which the User's map consumes to show a moving marker.

#### 2. Geospatial Searching
Utilize MongoDB’s `$near` operator to allow Regular Users to find the closest available ICU beds within a specific radius (e.g., "Find hospitals with beds within 10km").

#### 3. Concurrency Control
Implement "Optimistic Concurrency Control" for bed updates. If two representatives try to update the bed count simultaneously, the system must ensure the data remains consistent and doesn't result in negative bed counts.

#### 4. Security & Performance
* **Rate Limiting:** Protect the ambulance request API from spam using `express-rate-limit`.
* **Input Validation:** Use `Joi` or `Zod` to validate all incoming data before it touches the database.
* **Caching:** Use Redis to cache the list of hospitals, as this data is read frequently but updated less often than the bed counts.

---

### Execution Roadmap

1.  **Phase 1 (API & Auth):** Set up Node/Express with JWT. Define middleware to check roles (e.g., `checkRole(['admin', 'moderator'])`).
2.  **Phase 2 (Database):** Configure MongoDB Atlas. Set up Geospatial indexes on the `location` fields.
3.  **Phase 3 (Map Integration):** Integrate Mapbox or Google Maps in React. Color-code markers based on bed availability.
4.  **Phase 4 (Tracking Engine):** Implement Socket.io server-side logic for handling driver-to-user location broadcasting.
5.  **Phase 5 (Dashboards):** Build custom UI layouts for the 5 different user roles.
6.  **Phase 6 (DevOps):** Implement logging (Winston/Morgan) and deploy using a process manager like PM2 or Docker.

Sir, would you like me to provide the **Node.js middleware** for handling these 5 specific roles, or should I generate the **Socket.io logic** for the ambulance tracking?