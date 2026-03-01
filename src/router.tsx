import { createBrowserRouter } from "react-router-dom";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { AuthGate } from "@/components/layout/AuthGate";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";
import Profile from "@/pages/Profile";
import WorkspacesPage from "@/pages/workspaces/WorkspacesPage";
import WorkspaceDetailPage from "@/pages/workspaces/WorkspaceDetailPage";

// Importações do Módulo de Comunicação
import CommunicationDashboard from "@/pages/communication/Dashboard";
import PublicValidator from "@/pages/public/validate/PublicValidator";
import DigitalValidator from "@/pages/public/validate/DigitalValidator";
import CreateDocument from "@/pages/communication/CreateDocument";
import DocumentView from "@/pages/communication/DocumentView";
import Settings from "@/pages/Settings";

import VirtualProcessesPage from "@/pages/virtual-processes/VirtualProcessesPage";

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

  // Rota Pública de Validação (Fora do AppLayout)
  {
    path: "/validate/:protocol",
    element: <PublicValidator />,
  },
  {
    path: "/verify/:hash",
    element: <DigitalValidator />,
  },

  {
    children: [
      {
        element: <AuthGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "/", element: <Dashboard /> },

              { path: "/financeiro", element: <Placeholder title="Financeiro" /> },

              { path: "/workspaces", element: <WorkspacesPage /> },
              { path: "/workspaces/:id", element: <WorkspaceDetailPage /> },

              // --- MÓDULO DE COMUNICAÇÃO ---
              { path: "/communication", element: <CommunicationDashboard /> },
              { path: "/communication/create", element: <CreateDocument /> },
              // Rota para visualização de documentos
              { path: "/communication/document/:id", element: <DocumentView /> },
              { path: "/communication/drafts", element: <Placeholder title="Rascunhos" /> },
              { path: "/communication/sent", element: <Placeholder title="Enviados" /> },
              { path: "/communication/pending", element: <Placeholder title="Pendentes" /> },
              { path: "/communication/signed", element: <Placeholder title="Assinados" /> },

              {
                element: <PermissionGate anyOf={["processes:read", "processes:write", "processes:manage", "processes:download"]} />,
                children: [{ path: "/processos-virtuais", element: <VirtualProcessesPage /> }],
              },

              { path: "/biblioteca", element: <Placeholder title="Biblioteca" /> },
              { path: "/configuracoes", element: <Settings /> },

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
    ],
  },
]);