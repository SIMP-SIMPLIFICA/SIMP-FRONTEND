import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";

export function PermissionGate({ anyOf }: { anyOf: string[] }) {
  const { data } = useMe(true);

  if (!data) return null;

  const ok = hasAnyPermission(data, anyOf);
  if (!ok) return <Navigate to="/" replace />;

  return <Outlet />;
}
