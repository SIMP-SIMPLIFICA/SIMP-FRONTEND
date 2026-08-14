import { createBrowserRouter } from "react-router-dom";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ModuleGate } from "@/components/layout/ModuleGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SuperAdminRoute } from "@/components/layout/SuperAdminRoute";

import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import SuspendedAccess from "@/pages/SuspendedAccess";

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
import ConfiguracoesProcessos from "@/pages/processos-virtuais/Configuracoes";
import CalendarPage from "@/pages/utilidades/Calendar";
import NotesPage from "@/pages/utilidades/Notes";
import AdminPanel from "@/pages/admin/AdminPanel";
import AdminNewOrganizationPage from "@/pages/admin/AdminNewOrganizationPage";
import AdminOrganizationDetailPage from "@/pages/admin/AdminOrganizationDetailPage";
import SupportAdminPage from "@/pages/admin/SupportAdminPage";
import OrganizacaoPage from "@/pages/OrganizacaoPage";
import LibraryPage from "@/pages/library/LibraryPage"
import CovenantsPage from "@/pages/convenios/CovenantsPage";
import OfficialProtocolsPage from "@/pages/protocolos/OfficialProtocolsPage";
import DepartmentsPage from "@/pages/Departments";
import CouncilsPage from "@/pages/councils/CouncilsPage";
import CouncilDetailPage from "@/pages/councils/CouncilDetailPage";
import MeetingDetailPage from "@/pages/councils/MeetingDetailPage";
import CouncilSignReturnPage from "@/pages/councils/CouncilSignReturnPage";

export const router = createBrowserRouter([
  // Rotas públicas
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  // Pública de propósito: a sessão é limpa antes do redirecionamento, então uma
  // rota protegida cairia no login e criaria laço de redirecionamento.
  { path: "/acesso-suspenso", element: <SuspendedAccess /> },

  // Rotas protegidas — Super Admin
  {
    element: <SuperAdminRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/admin",                        element: <AdminPanel /> },
          { path: "/admin/organizations/new",      element: <AdminNewOrganizationPage /> },
          { path: "/admin/organizations/:id",      element: <AdminOrganizationDetailPage /> },
          { path: "/admin/support",                element: <SupportAdminPage /> },
        ],
      },
    ],
  },

  // Rotas protegidas
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },

          {
            element: <ModuleGate module="finance" />,
            children: [{
              element: <PermissionGate anyOf={["finance:read", "finance:write", "finance:approve", "finance:export"]} />,
              children: [
                { path: "/financeiro", element: <FinanceiroOverview /> },
                { path: "/financeiro/lancamentos", element: <Lancamentos /> },
                { path: "/financeiro/relatorios", element: <Relatorios /> },
                { path: "/financeiro/inteligencia", element: <Inteligencia /> },
                { path: "/financeiro/contas", element: <ContasBancarias /> },
                { path: "/financeiro/categorias", element: <Categorias /> },
              ],
            }],
          },

          {
            element: <ModuleGate module="tasks" />,
            children: [
              { path: "/workspaces", element: <WorkspacesPage /> },
              { path: "/workspaces/:id", element: <WorkspaceDetailPage /> },
            ],
          },

          {
            element: <ModuleGate module="communication" />,
            children: [{
              element: <PermissionGate anyOf={["documents:read", "documents:create", "documents:manage", "documents:sign", "documents:send"]} />,
              children: [
                { path: "/communication", element: <Communication /> },
              ],
            }],
          },
          {
            element: <ModuleGate module="virtual_processes" />,
            children: [{
              element: <PermissionGate anyOf={["processes:read", "processes:write", "processes:manage", "processes:download"]} />,
              children: [
                { path: "/processos-virtuais", element: <ProcessosVirtuais /> },
                { path: "/processos-virtuais/configuracoes", element: <ConfiguracoesProcessos /> },
              ],
            }],
          },
          {
            element: <ModuleGate module="calendar" />,
            children: [
              { path: "/utilidades", element: <CalendarPage /> },
              { path: "/utilidades/calendario", element: <CalendarPage /> },
            ],
          },
          {
            element: <ModuleGate module="notes" />,
            children: [
              { path: "/utilidades/notas", element: <NotesPage /> },
            ],
          },

          {
            element: <ModuleGate module="library" />,
            children: [{
              element: <PermissionGate anyOf={["library:read"]} />,
              children: [{ path: "/biblioteca", element: <LibraryPage /> }],
            }],
          },
          {
            element: <ModuleGate module="covenants" />,
            children: [{
              element: <PermissionGate anyOf={["covenants:read", "covenants:write", "covenants:delete"]} />,
              children: [
                { path: "/convenios", element: <CovenantsPage /> },
              ],
            }],
          },
          {
            element: <ModuleGate module="protocols" />,
            children: [{
              element: <PermissionGate anyOf={["protocols:read", "protocols:write", "protocols:admin"]} />,
              children: [
                { path: "/protocolos", element: <OfficialProtocolsPage /> },
              ],
            }],
          },
          {
            element: <PermissionGate anyOf={["settings:read", "settings:write", "system:admin"]} />,
            children: [{ path: "/configuracoes", element: <Placeholder title="Configurações" /> }],
          },

          { path: "/profile", element: <Profile /> },
          { path: "/organizacao", element: <OrganizacaoPage /> },

          {
            element: <PermissionGate anyOf={["users:read", "users:manage"]} />,
            children: [{ path: "/usuarios", element: <Users /> }],
          },
          {
            element: <PermissionGate anyOf={["roles:read", "roles:manage"]} />,
            children: [{ path: "/roles", element: <Roles /> }],
          },
          {
            element: <PermissionGate anyOf={["departments:read", "departments:write", "departments:delete"]} />,
            children: [{ path: "/departamentos", element: <DepartmentsPage /> }],
          },
          {
            // TODO: wrap children in PermissionGate anyOf={["councils:read","councils:write","councils:admin"]} when permission keys are configured
            element: <ModuleGate module="councils" />,
            children: [
              { path: "/conselhos",                                 element: <CouncilsPage /> },
              { path: "/conselhos/:id",                             element: <CouncilDetailPage /> },
              { path: "/conselhos/:id/reunioes/:meetingId",         element: <MeetingDetailPage /> },
              // Route must match the backend's hardcoded redirect: /councils/sign/return
              { path: "/councils/sign/return",                      element: <CouncilSignReturnPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
