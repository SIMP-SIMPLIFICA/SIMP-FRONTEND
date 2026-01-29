import { createBrowserRouter } from "react-router-dom";

import { AuthGate } from "@/components/layout/AuthGate";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";
import Profile from "@/pages/Profile";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },

  {
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },

          { path: "/financeiro", element: <Placeholder title="Financeiro" /> },
          { path: "/workspaces", element: <Placeholder title="Workspaces" /> },
          { path: "/biblioteca", element: <Placeholder title="Biblioteca" /> },
          { path: "/configuracoes", element: <Placeholder title="Configurações" /> },

          { path: "/profile", element: <Profile /> },

          {
            element: <PermissionGate anyOf={["users:read", "users:manage"]} />,
            children: [{ path: "/usuarios", element: <Users /> }],
          },

          {
            element: <PermissionGate anyOf={["roles:read", "roles:manage"]} />,
            children: [{ path: "/roles", element: <Roles /> }],
          },
        ],
      },
    ],
  },
]);