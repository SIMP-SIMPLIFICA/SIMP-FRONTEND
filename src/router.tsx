import { createBrowserRouter } from "react-router-dom";

import { AuthGate } from "@/components/layout/AuthGate";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import Users from "@/pages/Users";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    // tudo daqui pra baixo exige token + /auth/me válido
    element: <AuthGate />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/financeiro", element: <Placeholder title="Financeiro" /> },
          { path: "/workspaces", element: <Placeholder title="Workspaces" /> },
          { path: "/biblioteca", element: <Placeholder title="Biblioteca" /> },
          { path: "/configuracoes", element: <Placeholder title="Configurações" /> },

          // Protegida por permissão
          {
            element: <PermissionGate anyOf={["users:read", "users:manage"]} />,
            children: [{ path: "/usuarios", element: <Users /> }],
          },
        ],
      },
    ],
  },
]);
