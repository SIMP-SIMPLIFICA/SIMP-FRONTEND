import { createBrowserRouter } from "react-router-dom";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";
import Profile from "@/pages/Profile";

import FinanceiroOverview from "@/pages/financeiro/FinanceiroOverview";
import Lancamentos from "@/pages/financeiro/Lancamentos";
import Relatorios from "@/pages/financeiro/Relatorios";
import Inteligencia from "@/pages/financeiro/Inteligencia";
import ContasBancarias from "@/pages/financeiro/Contas";
import Categorias from "@/pages/financeiro/Categorias";
import WorkspacesPage from "@/pages/workspaces/WorkspacesPage";
import WorkspaceDetailPage from "@/pages/workspaces/WorkspaceDetailPage";
import Communication from "@/pages/Communication";
import ProcessosVirtuais from "@/pages/processos-virtuais/ProcessosVirtuais";

export const router = createBrowserRouter([
  // Rotas públicas
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },

  // Rotas protegidas
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },

          { path: "/financeiro", element: <FinanceiroOverview /> },
          { path: "/financeiro/lancamentos", element: <Lancamentos /> },
          { path: "/financeiro/relatorios", element: <Relatorios /> },
          { path: "/financeiro/inteligencia", element: <Inteligencia /> },
          { path: "/financeiro/contas", element: <ContasBancarias /> },
          { path: "/financeiro/categorias", element: <Categorias /> },

          { path: "/workspaces", element: <WorkspacesPage /> },
          { path: "/workspaces/:id", element: <WorkspaceDetailPage /> },

{ path: "/communication", element: <Communication /> },
          { path: "/processos-virtuais", element: <ProcessosVirtuais /> },
          { path: "/utilidades", element: <Placeholder title="Utilidades" /> },

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
