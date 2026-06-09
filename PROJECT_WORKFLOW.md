# GroupPay Project Workflow Guide

Welcome to the **GroupPay** project! If you are transitioning from standard **JavaScript (JS)** and **React** to **TypeScript (TS)**, this document is designed to guide you through how the codebase is structured, how the development lifecycle works, and how to read the TS annotations easily.

---

## 💡 JavaScript to TypeScript Quick Primer

Don't let the `.ts` and `.tsx` extensions worry you. TypeScript is just **JavaScript with type labels**. The browser cannot run TS directly; when you run `npm run build`, all type labels are stripped away, compiling down to standard, clean JavaScript.

Here is how to read the TS syntax in our code:

### 1. Interfaces & Types (`src/types/index.ts`)
Instead of guessing what properties an object has, we define a "contract" (interface):
```typescript
// TS Code
export interface Profile {
  id: string;          // must be a string
  share_id: string;    // must be a string
  name: string;        // must be a string
  avatar_url: string | null; // can be a string OR null
}
```
In plain JS, you would just use the object. In TS, we use these definitions to prevent bugs like calling `profile.name` when `profile` is undefined.

### 2. Component Props
In JS, you pass props blindly. In React + TS, we specify what props the component expects:
```tsx
// TS Component Props
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'glass'; // only these values allowed
  loading?: boolean;
}

export function Button({ children, variant = 'primary', loading }: ButtonProps) {
  return <button>{children}</button>;
}
```

---

## 🗺️ Product Workflow: Life Cycle

```
[1. Problem] ➔ [2. Requirements] ➔ [3. Design] ➔ [4. Development] ➔ [5. Testing] ➔ [6. Deployment] ➔ [7. Future Scope]
```

### 1. Problem
Traditional expense splitters (like Splitwise) have become increasingly cluttered, restricted behind paywalls, or lack a premium modern user experience. Users need a free, fast, real-time tool with world-class aesthetics to split group travel expenses or household bills and instantly calculate the absolute minimum number of payments required to settle debts.

---

### 2. Requirements
- **Authentication**: Email/password authentication securely connected to Supabase Auth.
- **Invite Engine**: Auto-generate a unique 8-character `share_id` (e.g. `SARH4029`) for every user profile so they can connect without revealing private email addresses.
- **Connections**: A bilateral friends directory and multi-member groups.
- **Split Strategies**: Support Equal, Unequal (exact amounts), Percentage (%), and Shares ratio splits.
- **Optimal Settle Up**: A greedy debt-simplification algorithm that reduces transaction volumes (minimizes the number of peer-to-peer transfers).
- **Attachments**: Support receipt attachment uploads directly to Supabase Storage.
- **Real-time Synchronization**: Instant client UI state updates via Supabase PostgreSQL Realtime listeners.

---

### 3. Design
- **Theme**: Dark premium aesthetic (`#070a13` background) with purple and blue ambient radial glows.
- **Glassmorphism Panels**: UI cards styled with:
  ```css
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(24px);
  border-radius: 24px;
  ```
- **Typography**: Inter font with bold, tracking-tight headings and extrabold numbers.
- **Mobile First**: Collapsible desktop drawers and a persistent bottom navigation bar on mobile screen sizes.
- **Micro-interactions**: Subtle hover scaling (`scale-102` / 300ms transitions) on cards and buttons using **Framer Motion**.

---

### 4. Development (Codebase Map)
The project structure is organized modularly:

```text
src/
├── components/          # Reusable UI elements
│   ├── ui/              # Buttons, Inputs, Skeletons, Error Boundary, Toasts, Modals
│   └── Layout.tsx       # Sidebar, Topbar Search, Bell dropdown, and Mobile Bottom Nav
├── pages/               # Application Screens
│   ├── Landing.tsx      # Public animated product page (Vercel-style)
│   ├── auth/            # Login, Signup, ForgotPassword screen
│   ├── dashboard/       # Dashboard with Hero card, Actions, and Recharts
│   ├── friends/         # Friends directory and personal settle up forms
│   ├── groups/          # Groups creation list and details page
│   ├── activity/        # Chronological audit timeline logs
│   ├── settlements/     # Settlements history logs
│   ├── settings/        # Preferences panel (Dark theme selection, Currencies)
│   └── NotFound.tsx     # 404 Fallback page
├── hooks/               # Custom React Hooks
│   ├── useAuth.tsx      # Auth session and profile manager context
│   └── useRealtime.ts   # Subscribes to PostgreSQL database updates
├── services/            # Supabase Connectors
│   ├── supabase.ts      # Instantiates Supabase Client
│   ├── api.ts           # DB query calls (Select, Insert, Custom feeds)
│   └── storage.ts       # Handles receipt file uploads to storage bucket
├── utils/               # Mathematical helpers
│   ├── splitCalc.ts     # Split calculators logic (Equal, Unequal, %, Shares)
│   └── helpers.ts       # Formatters (Currency, relative dates, avatar colors)
├── App.tsx              # Code-split router configuration
└── index.css            # Global Tailwind overrides, glows, and scrollbars
```

---

### 5. Testing
- **Local compilation check**: Run `npm run build` to verify there are no TypeScript syntax errors or Vite packager issues.
- **Math verification**: Test split edge cases (e.g. division remainders like $10 split equally among 3 users = $3.33 + $3.33 + $3.34) in `src/utils/splitCalc.ts`.
- **Security Check (RLS)**: Row-Level Security policies tested inside Supabase database to ensure users can only view or edit groups/expenses they are members of.

---

### 6. Deployment
- **Git Pipeline**: Local changes are committed to Git and pushed to GitHub.
- **Vercel Hosting**: Imported GitHub repo into Vercel under a free tier plan.
- **Environment Settings**: Add environment variables in Vercel settings:
  - `VITE_SUPABASE_URL` = your Supabase URL
  - `VITE_SUPABASE_ANON_KEY` = your Supabase Anon Key
- Vercel automatically deploys every branch push to production instantly.

---

### 7. Future Scope
- **OCR Receipt Scanning**: Add OCR text extraction to scan paper receipts and pre-populate split amounts.
- **Settlement Payments Integration**: Connect Stripe or PayPal sandboxes to settle up transactions directly in-app.
- **Multi-currency Converter**: Integrate a live Exchange Rates API to convert currencies on the fly.
- **Group Chats**: Real-time group messaging within each expense hub.

---

## 🗺️ Visual Mind Map (Project Lifecycle Flow)

```text
==================================================================================================
                                      GROUPPAY WORKFLOW MIND MAP
==================================================================================================

[PROBLEM] 
  │
  └── Cluttered Expense Splitters  ➔  Need Premium Aesthetics  ➔  Optimal Debt Settlements (Bilateral)
  │
  ▼
[REQUIREMENTS]
  │
  ├── Secure Auth (Supabase)       ─── Unique Invite share_id (e.g. ABHI7281)
  ├── Bilateral Friends            ─── Multi-user Groups
  ├── Splits (Equal/%/Shares)      ─── Greedy Debt Minimizer (Optimal transfers)
  └── Receipt Uploads (Storage)    ─── Real-time Sync (Supabase Realtime)
  │
  ▼
[DESIGN]
  │
  ├── Dark Navy Glow Theme         ─── Glassmorphism Panels (rgba 255/255/255/0.08)
  ├── Mobile Bottom Nav            ─── Framer Motion (Scale 1.02 card hover)
  └── Inter Typography
  │
  ▼
[DEVELOPMENT]
  │
  ├── components/ (ui, Layout)     ─── pages/ (Landing, Dashboard, Friends, Groups)
  ├── services/ (api, supabase)    ─── hooks/ (useAuth, useRealtime)
  └── utils/ (splitCalc, helpers)
  │
  ▼
[TESTING]
  │
  ├── npm run build (TS check)     ─── Split Math & Remainder Checks
  └── Supabase RLS Policy Auditing
  │
  ▼
[DEPLOYMENT]
  │
  ├── Git push to GitHub           ─── Import repo in Vercel Free Plan
  └── Inject Prod Environment Vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  │
  ▼
[FUTURE SCOPE]
  │
  ├── OCR Receipt Image Scanning   ─── Sandy Stripe Payments Integration
  └── Multi-currency conversions   ─── Real-time Group Chats
==================================================================================================
```
