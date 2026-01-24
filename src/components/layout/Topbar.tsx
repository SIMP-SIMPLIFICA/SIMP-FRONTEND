import { Bell } from "lucide-react";

export function Topbar({ title = "Dashboard" }: { title?: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="text-xl font-semibold text-slate-800">{title}</div>

      <div className="flex items-center gap-4">
        <button className="relative grid h-10 w-10 place-items-center rounded-full border bg-white">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="font-semibold text-slate-800">Carlos Mendes</div>
            <div className="text-sm text-slate-500">Gestor de Obras</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700 font-semibold">
            CM
          </div>
        </div>
      </div>
    </header>
  );
}
