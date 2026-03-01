import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export type RoleDetailsRole = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  color: string | null;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

export function RoleDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleDetailsRole | null;
}) {
  const { open, onOpenChange, role } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes da role</DialogTitle>
          <DialogDescription>
            {role ? (
              <>
                <span className="font-medium">{role.displayName}</span>{" "}
                <span className="text-slate-400">•</span>{" "}
                <span className="font-mono">{role.name}</span>
              </>
            ) : (
              "—"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {role ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Status</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      className={[
                        "rounded-full border px-2 py-0.5 text-xs",
                        role.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200",
                      ].join(" ")}
                    >
                      {role.isActive ? "Ativa" : "Inativa"}
                    </Badge>

                    <Pill>{role.isSystem ? "System" : "Custom"}</Pill>
                    {role.color ? <Pill>Cor: {role.color}</Pill> : <Pill>Sem cor</Pill>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Auditoria</div>
                  <div className="mt-2 flex flex-col gap-2 text-sm text-slate-700">
                    <div>
                      <span className="text-slate-500">Criada em:</span> {formatDate(role.createdAt)}
                    </div>
                    <div>
                      <span className="text-slate-500">Atualizada em:</span>{" "}
                      {formatDate(role.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {role.description ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Descrição</div>
                  <div className="mt-2 text-sm text-slate-800">{role.description}</div>
                </div>
              ) : null}

              <Separator />

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Permissões</div>
                <div className="mt-2 text-xs text-slate-500">Total: {role.permissions.length}</div>

                <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                  {role.permissions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">Nenhuma permissão.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="rounded-full bg-slate-100 px-3 py-1 text-slate-800 border border-slate-200"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
