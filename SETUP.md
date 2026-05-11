# Vapor World CRM – Setup Guide

## Prerequisites
- Node.js 18+
- MySQL 8.0+ (local or Hostinger)
- npm

---

## 1. Database Setup

Run this in MySQL:
```sql
SOURCE backend/src/config/schema.sql;
```

Or manually in phpMyAdmin: import `backend/src/config/schema.sql`

Default admin login:
- Mobile: `01700000000`
- Password: `password`

**Change this immediately after first login.**

---

## 2. Backend Setup

```bash
cd backend
npm install
```

Edit `.env` with your values:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` → change to a long random string
- `SMTP_*` → your Hostinger email credentials

```bash
npm run dev      # development
npm start        # production
```

Server runs on: http://localhost:5000

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev      # development
npm run build    # production build
```

App runs on: http://localhost:5173

---

## 4. Production Deployment (Hostinger)

### Backend (Node.js hosting):
1. Upload `backend/` folder
2. Set environment variables in hosting panel
3. Entry point: `src/app.js`

### Frontend:
1. Run `npm run build` → generates `dist/` folder
2. Upload `dist/` contents to public_html

---

## Default Task Templates (pre-seeded)
1. Daily Stock Check (proof required, 8h deadline)
2. Shelf Refill (proof required, 4h deadline)
3. Outlet Visit (proof required, 24h deadline)
4. Delivery Confirmation (proof required, 2h deadline)
5. Display Setup (proof required, 6h deadline)
6. Cleaning & Hygiene (12h deadline)

---

## Roles
- **Admin**: Full access — assign tasks, view all, manage team
- **Staff**: See own tasks, update status, upload proof
