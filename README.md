Here is the updated **`README.md`** in English, replacing the generic Vite template with the specific documentation for your SIMP project.

After updating the file, run the git commands below.

### 1. Update `README.md`

Replace all content in your `README.md` file with this:

```markdown
# SIMP - Frontend (Municipal Management System)

Modern administrative interface for municipal management, built with **React**, **TypeScript**, and **Tailwind CSS**. This project consumes a Node.js/Fastify API (Boilerplate) with full authentication and Role-Based Access Control (RBAC).

![Status](https://img.shields.io/badge/Status-Finished-success)
![Coverage](https://img.shields.io/badge/Swagger-100%25_Covered-blue)

## 🚀 Technologies

* **Core:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS, shadcn/ui (Radix Primitives)
* **Routing:** React Router DOM v6
* **Icons:** Lucide React
* **Http Client:** Fetch API (Custom wrapper with Interceptors)
* **State Management:** Native Hooks + Context API (Auth)

## ✨ Features

### 🔐 Authentication & Security
* Login with "Remember me" support.
* **Automatic Refresh Token:** Silent session renewal (401 Interceptor).
* **Password Recovery:** Full "Forgot Password" and "Reset Password" flow via email token.
* **Sessions:** View and remotely revoke connected devices.

### 👥 User Management
* **Full CRUD:** Create, List, Update, and Delete users.
* **Status Control:** Activate/Deactivate accounts with reason logging.
* **Force Reset:** Admin can force a password reset for any user.
* **Session Management:** Admin can terminate specific user sessions.

### 🛡️ Access Management (RBAC)
* **Roles:** Create, Edit, Duplicate, and Delete access profiles.
* **Permissions:** Visual catalog organized by modules (Users, Financial, System, etc.) with Fallback support.
* **Protection:** Edit lock for System Roles (`isSystem`).

### 👤 User Profile (My Account)
* Profile update (Name, Surname).
* Secure password change.
* Self-management of active sessions.

---

## 🛠️ How to Run

### Prerequisites
* Node.js (v18+)
* Backend (API) running locally or remotely.

### 1. Installation
Clone the repository and install dependencies:

```bash
git clone [https://github.com/your-username/simp-frontend.git](https://github.com/your-username/simp-frontend.git)
cd simp-frontend
npm install

```

### 2. Configuration

Create a `.env` file in the project root (based on `.env.example`):

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

```

### 3. Running

Start the development server:

```bash
npm run dev

```

Access `http://localhost:5173` in your browser.

---

## 🔑 Default Credentials (Dev Environment)

If using the standard backend seed:

* **Email:** `admin@example.com`
* **Password:** `Admin123!`

---

## 📂 Project Structure

```text
src/
├── components/
│   ├── layout/       # Sidebar, Topbar, AuthGate, PermissionGate
│   ├── roles/        # Roles specific modals and tables
│   ├── users/        # Users specific modals and tables
│   └── ui/           # Base components (shadcn/ui)
├── hooks/            # Custom hooks (useMe, useToast)
├── lib/
│   ├── api.ts        # HTTP Client with Refresh Token interceptor
│   ├── auth.ts       # Token Management (LocalStorage)
│   └── permissions.ts# Permission verification utilities
├── pages/            # Application screens (Login, Dashboard, Users...)
└── router.tsx        # Definition of public and protected routes

```

## 📦 Build for Production

To generate optimized static files for deployment:

```bash
npm run build

```

The files will be generated in the `dist/` folder.

```

