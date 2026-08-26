# School Library Management Software (MERN Stack)

A modern, full-featured **School & Campus Library Management SaaS Application** built using React, Express, Node.js, MongoDB, TypeScript, and ImageKit CDN.

---

## 🌟 Key Features

- **School & Multi-Tenant Architecture**:
  - Super Admin Dashboard for plan & school subscription management.
  - School Admin Portal with custom branding, class & section management.

- **Book Catalog & Serial Management**:
  - Auto-incrementing Accession / Serial numbers (e.g., `ACC-0001 ~ ACC-0005`).
  - **ImageKit CDN Integration**: Upload book cover photos directly via ImageKit API.
  - Sub-categories, price, supplier, shelf/rack location tracking.
  - Individual copy status (Available, Assigned, Damaged, Lost).

- **Member & Circulation Workflows**:
  - Student & Teacher registration with WhatsApp contact integration.
  - Book Issue & Return system with automatic overdue fine calculation.
  - Lost/Damaged book recovery and fine management.

- **Subscription Tiers & Analytics**:
  - Tiered plan system (Starter, Pro, Enterprise) with quotas on book catalog & members.
  - Visual analytics dashboard with charts and circulation reports.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TailwindCSS v4, Lucide Icons, Recharts, Motion.
- **Backend**: Node.js, Express.js, TypeScript, Mongoose ODM.
- **Database**: MongoDB (Live MongoDB Atlas or embedded in-memory MongoDB fallback).
- **File & Media Storage**: ImageKit CDN Node SDK & Client Uploads.
- **Authentication**: JWT Token authentication & Role-Based Access Control (RBAC).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **bun**

### 2. Environment Setup
Copy `.env.example` to `.env` and `.env.local`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/library_management_software"
JWT_SECRET="school_library_jwt_secret_key_2026"
IMAGEKIT_PUBLIC_KEY="public_xxxx"
IMAGEKIT_PRIVATE_KEY="private_xxxx"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/xxxx"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔑 Demo Access Credentials

- **Super Admin**: `superadmin@platform.com` / `superadmin123`
- **School Admin**: `admin@school.edu` / `admin123`
