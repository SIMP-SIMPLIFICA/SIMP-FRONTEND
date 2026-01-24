import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { useMe } from "@/hooks/useMe";

export function AuthGate() {
  const token = getAccessToken();
  const location = useLocation();

  // ✅ hook SEMPRE é chamado, mas só roda quando tem token
  const me = useMe(Boolean(token));

  // se não tem token, manda pro login (sem chamar API)
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // tem token -> valida no backend
  if (me.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F6F8FC]">
        <div className="text-slate-600">Carregando...</div>
      </div>
    );
  }

  if (me.isError) {
    clearAccessToken();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
