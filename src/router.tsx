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
import Grants from "@/pages/Grants"; // Import da página de Convênios

export const router = createBrowserRouter([
  // --- Rotas Públicas ---
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

  // --- Rotas Privadas (Protegidas) ---
  {
    element: <AuthGate />, // Garante que só logado acessa
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },
          
          // Nova Rota de Convênios
          { path: "/convenios", element: <Grants /> },

          { path: "/financeiro", element: <Placeholder title="Financeiro" /> },
          { path: "/workspaces", element: <Placeholder title="Workspaces" /> },
          { path: "/biblioteca", element: <Placeholder title="Biblioteca" /> },
          { path: "/configuracoes", element: <Placeholder title="Configurações" /> },

          { path: "/profile", element: <Profile /> },

          // Rotas com Permissão Específica
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