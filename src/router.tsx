import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/financeiro", element: <Placeholder title="Financeiro" /> },
      { path: "/workspaces", element: <Placeholder title="Workspaces" /> },
      { path: "/biblioteca", element: <Placeholder title="Biblioteca" /> },
      { path: "/configuracoes", element: <Placeholder title="Configurações" /> },
    ],
  },
]);
