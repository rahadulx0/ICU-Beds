## Project Specification: ICU Beds 

### Core Objective

Build a web application named **ICU Beds** to track and display real-time empty ICU beds on an interactive map. The system must support real-time updates and a hierarchical Role-Based Access Control (RBAC) system.

### Tech Stack

* **Frontend:** React.js (Vite) with Tailwind CSS for UI.
* **Mapping:** MapLibre GL JS with OpenStreetMap tiles or a vector provider.
* **Backend & Database:** Firebase (Firestore for data, Firebase Auth for users).
* **State Management:** React Context API or Redux Toolkit for managing user roles.

---

### Database Schema & Authentication

Implement Firebase Authentication with three distinct roles stored in a `users` collection in Firestore:

1. **Admin:** Full access. Can create/delete hospital entries, manage Moderator accounts, and edit any data.
2. **Moderator:** Can manage and edit hospital information for a specific region or a list of hospitals assigned by the Admin.
3. **Hospital Representative:** Can only update the bed count and basic info for their specifically assigned hospital.

**Firestore Structure:**

* `hospitals/` (Collection): { `name`, `coordinates` (GeoPoint), `total_beds`, `available_beds`, `address`, `assigned_rep_id`, `last_updated` }
* `users/` (Collection): { `uid`, `email`, `role` (admin/moderator/rep), `assigned_hospitals` (Array of IDs) }

---

### Key Features to Implement

#### 1. Public Map Interface (MapLibre GL JS)

The landing page must feature a full-screen map using **MapLibre GL JS**.

* Markers should represent hospitals.
* **Color Coding:** Markers must change color based on availability (e.g., Green for >5 beds, Yellow for 1-5, Red for 0).
* **Popups:** Clicking a marker should show a popup with hospital details and a "Last Updated" timestamp.
* **Real-time Updates:** Use Firestore's `onSnapshot` to ensure that when a representative updates a bed count, the marker color/data updates on the map instantly without a page refresh.

#### 2. Administrative Dashboard

A protected route (`/dashboard`) that renders different views based on the logged-in user's role:

* **Admin View:** A table to manage all hospitals and users. Ability to invite/assign Moderators.
* **Hospital Rep View:** A simplified UI with a single input field to update `available_beds` for their assigned facility.

---

### Security Rules (Firestore)

The AI Agent must implement strict Firestore Security Rules:

* **Read:** Publicly readable for the `hospitals` collection.
* **Write (Admin):** `allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`.
* **Write (Rep):** `allow update: if request.auth.uid == resource.data.assigned_rep_id`.

---

### Project Execution Steps for the AI

1. Setup a Vite + React project with Tailwind CSS.
2. Configure Firebase and initialize Firestore and Auth.
3. Integrate MapLibre GL JS to fetch and display hospital markers from Firestore.
4. Create a Login/Signup system with Role-Based routing.
5. Build the Update Dashboard for Hospital Representatives.
6. Ensure real-time synchronization between the Dashboard and the Map.

---
