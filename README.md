# ResQ SOS Web Client - Capstone Project

<div align="center">
  <br />
    <a href="/" target="_blank">
      <img src="https://res.cloudinary.com/dpqvdxj10/image/upload/v1778384162/52e64225-6db4-4906-9453-32fa3123a42e_iwsqtc.jpg" alt="Project Banner">
    </a>
  <br />

  <div>
<img src="https://img.shields.io/badge/-Next.js-000000?style=for-the-badge&logo=Next.js&logoColor=white" />
<img src="https://img.shields.io/badge/-React_19-61DAFB?style=for-the-badge&logo=React&logoColor=black" />
<img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white" />
<img src="https://img.shields.io/badge/-Tailwind_CSS-06B6D4?style=for-the-badge&logo=TailwindCSS&logoColor=white" /><br/>
<img src="https://img.shields.io/badge/-SignalR-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" />
<img src="https://img.shields.io/badge/-Firebase-FFCA28?style=for-the-badge&logo=Firebase&logoColor=black" />
<img src="https://img.shields.io/badge/-Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white" />
<img src="https://img.shields.io/badge/-Zustand-443E38?style=for-the-badge&logoColor=white" />
  </div>

  <h3 align="center">RES-Q | Intelligent System for SOS Triage and Disaster Resource Allocation</h3>

</div>

Emergency Rescue and Disaster Coordination System (RES-Q) — Web Client Dashboard.

## 📋 <a name="table">Table of Contents</a>

1. ✨ [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)

## <a name="introduction">✨ Introduction</a>

Web-based operations dashboard for the RES-Q emergency rescue platform, built with Next.js 16 and React 19. The client provides real-time SOS triage, mission dispatch, and resource management interfaces for coordinators, depot managers, and system administrators. Live updates are powered by Microsoft SignalR WebSocket connections, while Firebase Cloud Messaging delivers push notifications to operators in the field.

## <a name="tech-stack">⚙️ Tech Stack</a>

- **[Next.js 16](https://nextjs.org/)** is the React framework powering the application, using the App Router for server-side rendering, route-based code splitting, and PWA support.

- **[React 19](https://react.dev/)** is the UI library used across all dashboard screens, leveraging concurrent rendering and the latest server/client component model.

- **[TypeScript 5](https://www.typescriptlang.org/)** provides end-to-end static typing across the entire codebase, catching integration errors between services and UI components at compile time.

- **[Tailwind CSS v4](https://tailwindcss.com/)** handles all styling with utility classes, enabling a consistent design system built around an editorial grid layout.

- **[Radix UI / shadcn/ui](https://ui.shadcn.com/)** supplies accessible, headless UI primitives (dropdowns, selects, popovers, tooltips, etc.) that form the foundation of the component library.

- **[TanStack Query v5](https://tanstack.com/query)** manages all server state — fetching, caching, synchronizing, and invalidating API data with fine-grained control.

- **[Zustand v5](https://zustand-demo.pmnd.rs/)** handles global client-side state such as authentication tokens, map filters, and theme preferences.

- **[Microsoft SignalR](https://learn.microsoft.com/aspnet/core/signalr/introduction)** drives real-time WebSocket communication for SOS alerts, mission status updates, inventory changes, and live map tracking.

- **[Firebase SDK](https://firebase.google.com/)** integrates Firebase Cloud Messaging (FCM) for browser push notifications, delivering alerts to coordinators and depot managers instantly.

- **[Goong Maps + Leaflet + React Leaflet](https://goong.io/)** power the interactive field map, including clustering of SOS pins, assembly point overlays, and rescue team position tracking.

- **[Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/)** provides satellite and terrain tile layers rendered as a Leaflet plugin for the operational map.

- **[Chart.js + Recharts](https://www.chartjs.org/)** render dashboard analytics — funding trends, inventory levels, mission throughput, and SOS request statistics.

- **[Framer Motion + GSAP](https://www.framer.com/motion/)** handle UI animations and micro-interactions across dashboards and transition sequences.

- **[Axios](https://axios-http.com/)** is the HTTP client used for all REST API calls, wrapped in a custom instance with token refresh, circuit-breaker, and role-based redirect logic.

## <a name="features">🔋 Features</a>

👉 **Real-Time SOS Dashboard**: Live feed of incoming SOS requests with severity triage, cluster visualization, and one-click mission dispatch for coordinators.

👉 **Interactive Field Map**: Operational map powered by Goong Maps and Leaflet showing SOS pin clusters, assembly points, rescue team positions, and depot locations updated in real time via SignalR.

👉 **Mission Management**: Full mission lifecycle — create, assign người cứu hộ, track progress, and close missions — with live status synchronization across all connected clients.

👉 **Depot & Inventory Management**: Depot managers can monitor stock levels, approve supply requests, record stock movements, and track funding disbursements from a dedicated dashboard.

👉 **Admin Control Panel**: System administrators manage users, roles, rescue team registrations, depot configuration, AI prompt settings, and platform-wide analytics.

👉 **Push Notifications**: Firebase Cloud Messaging delivers browser push notifications for new SOS alerts, mission assignments, and inventory threshold warnings.

👉 **Role-Based Access Control**: Separate authenticated flows for Coordinators, Depot Managers, and Administrators, with route-level permission guards.

👉 **Real-Time Chat**: In-app messaging between coordinators and rescue teams during active missions, synchronized via SignalR hubs.

👉 **PWA Support**: Installable as a Progressive Web App on desktop and mobile browsers, with a service worker for push notification handling.

👉 **Dark Mode**: Full dark/light theme support with persisted preference and flicker-free initialization via an inline script before first paint.

And many more, including drag-and-drop inventory interfaces, Excel export, PDF viewing, and AI-assisted config management.

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed:

- **Node.js 20+**
- **npm** (bundled with Node.js)

**Clone the Repository**

```bash
git clone https://github.com/ReQ-SOS-Mien-Trung/resq-sos-web-client
cd resq-sos-web-client
```

**Install Dependencies**

```bash
npm install
```

**Configure Environment Variables**

Create a `.env.local` file at the project root and set the following:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:8080        # Backend API base URL
NEXT_PUBLIC_GOONG_MAP_KEY=<your-goong-map-key>   # Goong Maps API key
NEXT_PUBLIC_GOONG_API_KEY=<your-goong-api-key>   # Goong Directions API key

# Firebase (for FCM push notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

**Run the Development Server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Build for Production**

```bash
npm run build
npm start
```

---

_A Software Engineering capstone project submission._
