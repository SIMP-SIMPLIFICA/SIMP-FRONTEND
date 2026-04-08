import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ModuleGate({ module }: { module: string }) {
  const { isSuperAdmin, enabledModules, isLoading } = useAuth();

  if (isLoading) return null;
  if (isSuperAdmin) return <Outlet />;
  if (!enabledModules.includes(module)) return <Navigate to="/" replace />;

  return <Outlet />;
}
