# Recreating the KTS Go Admin Portal

This document provides a comprehensive guide for recreating the KTS Go admin portal. The portal is a full-featured dashboard for managing a bus transport service, built with a modern web stack and integrated with Firebase for its backend.

## 1. Core Technology Stack

To build a similar application, you will need the following technologies:

*   **Framework**: [Next.js](https://nextjs.org/) (using the App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Library**: [React](https://reactjs.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/) (a collection of accessible and reusable components)
*   **Backend & Database**: [Firebase](https://firebase.google.com/) (specifically Firestore for the database and Firebase Authentication)
*   **AI/Generative Features**: [Genkit](https://firebase.google.com/docs/genkit) (for integrating with generative models like Gemini)
*   **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation.
*   **Icons**: [Lucide React](https://lucide.dev/)

## 2. Firebase Firestore Data Models

The entire application relies on a structured Firestore database. Here are the key collections and their typical document structures:

#### `users`
Stores admin user information.
- `name` (string)
- `email` (string)
- `role` (string: "Admin" or "Super-Admin")

#### `buses`
Manages the fleet of buses.
- `numberPlate` (string)
- `capacity` (number)
- `status` (boolean: true for active, false for inactive)

#### `regions`
Defines operational areas.
- `name` (string)

#### `routes`
Defines travel routes and fares.
- `pickup` (string)
- `destination` (string)
- `price` (number)
- `status` (boolean)
- `regionId` (string: Firestore document ID from `regions` collection)
- `busIds` (array of strings: Firestore document IDs from `buses` collection)

#### `sessions`
Represents a scheduled journey or trip. A single session can be created for multiple routes, buses, and dates at once.
- `name` (string: A group name for the session, e.g., "Weekday Morning Trips")
- `routeId` (string: ID from `routes`)
- `busId` (string: ID from `buses`)
- `departureDate` (Timestamp)
- `createdAt` (Timestamp)

#### `passengers`
Stores information about registered passengers.
- `name` (string)
- `phone` (string)
- `emergencyContact` (string)

#### `referrals`
Manages referral partners.
- `name` (string)
- `phone` (string: This also acts as the referral code)

#### Booking Collections
- **`pending_bookings`**: Temporarily holds bookings awaiting payment.
- **`approved_bookings`**: Holds bookings approved by an admin but not yet paid (for offline payment scenarios).
- **`rejected_bookings`**: Stores cancelled, failed, or rejected bookings.
- **`bookings`**: The final collection for successfully paid and confirmed bookings.

A typical **booking document** (across all booking collections) contains:
- `name`, `phone`, `emergencyContact` (string)
- `pickup`, `destination` (string)
- `date` (Timestamp)
- `seats` (array of strings)
- `busType` (string)
- `totalAmount` (number)
- `ticketNumber`, `clientReference` (string)
- `status` (string: "pending", "approved", "paid", "rejected")
- `referralId` (string, optional)
- `rejectionReason` (string, optional)

#### `settings`
Stores configuration for third-party services.
- A document named `hubtel` holds API keys for the payment gateway.

## 3. Step-by-Step Implementation Guide

### Step 1: Setup Admin Authentication & Layout
- Create a login page at `/admin/login` that uses Firebase Authentication (email/password).
- Upon successful login, check if the user's UID exists in the `users` collection to authorize access.
- Create a main admin layout (`/admin/layout.tsx`) that includes a persistent sidebar for navigation. The sidebar should be responsive and collapsible.
- The layout should protect all admin routes, redirecting unauthenticated users to the login page.

### Step 2: Build the Dashboard
- Create the main dashboard page at `/admin`.
- Fetch and display key statistics from Firestore:
    - **Total Revenue**: Sum of `totalAmount` from the `bookings` collection.
    - **Total Passengers**: Count of documents in the `passengers` collection.
    - **Total Bookings**: Sum of documents in `bookings` and `pending_bookings`.
    - **Active Buses**: Count of documents in `buses` where `status` is true.
- Implement a bar chart to show financial analytics (e.g., monthly revenue).

### Step 3: Implement CRUD Management Pages
For each of the following, create a dedicated page with a table to display the data and modals (dialogs) for creating, editing, and deleting records. Use React Hook Form and Zod for robust form validation.

- **Manage Buses**: CRUD for the `buses` collection. Include a toggle switch to activate/deactivate buses.
- **Manage Regions**: CRUD for the `regions` collection.
- **Manage Routes**: CRUD for the `routes` collection. This form should include dropdowns to select a region and assign active buses.
- **Manage Sessions**:
    - Allow bulk creation of sessions by selecting multiple routes, buses, and dates from a calendar.
    - Display sessions grouped by name in a collapsible table.
    - Implement filters for date, route, and bus.
- **Manage Passengers**: Display a read-only table of all passengers.
- **Manage Referrals**: CRUD for the `referrals` collection. Also include an "Analytics" tab that shows how many passengers each referral has brought in.
- **Manage Admins**: CRUD for the `users` collection. The creation form should securely create a new user in both Firebase Auth and the `users` collection.

### Step 4: Build the Booking Management System
- Create a page at `/admin/bookings` with a tabbed interface for:
    - **Pending**: Display bookings from `pending_bookings`. Admins should be able to approve, reject, or manually mark as paid.
    - **Approved**: Display from `approved_bookings`. Admins can unapprove or reject.
    - **Paid**: Display from `bookings`. Super Admins should have an option to delete.
    - **Rejected**: Display from `rejected_bookings`. Admins can permanently delete these records.
- Implement filters on each tab for route and date.

### Step 5: Create the Booked Seats Manager
- Create a page at `/admin/booked-seats`.
- Add dropdowns to select a route, a date, and a bus for a specific journey.
- Display a visual seat map for the selected bus.
- Fetch all bookings for that journey and mark the corresponding seats as "occupied."
- Allow an admin to click on an occupied seat and, after confirmation, cancel the associated booking to free up the seat.

### Step 6: Integrate the AI Anomaly Spotter
- Create a page at `/admin/anomaly-spotter`.
- Use Genkit to define a flow that accepts a text description of user activity.
- The Genkit flow should use a generative model (like Gemini) with a prompt designed to analyze the text for signs of fraudulent or unusual booking behavior.
- The model should return a structured JSON object indicating if an anomaly was detected, a description of it, and recommendations for the admin.
- Display the results clearly on the page.

### Step 7: Configure System Settings
- Create a page at `/admin/settings`.
- Build a form to manage API credentials for the Hubtel payment gateway.
- Include a toggle for "Live Mode" vs. "Test Mode" to switch between different sets of API keys.
- Store these settings securely in a dedicated `settings` collection in Firestore.

By following this guide, you can successfully replicate the KTS Go admin portal, providing a powerful tool for managing a complete transport service business.