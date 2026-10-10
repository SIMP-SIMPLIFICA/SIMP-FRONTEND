import { useState } from "react";
import { FileSignature, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractFormDialog } from "@/components/fleet/ContractFormDialog";
import { toast } from "@/hooks/use-toast";
import { useDeleteFleetContract, useFleetContracts } from "@/hooks/useFleetFuelings";
import { useMe } from "@/hooks/useMe";
import { FUEL_TYPE_LABELS } from "@/lib/api/fleet";
import type { FleetContract } from "@/lib/api/fleet-fueling";
import { describeFleetError } from "@/lib/fleet-errors";
import { formatIsoDate } from "@/lib/fleet-format";
import { formatBrl, formatUnitPrice } from "@/lib/fleet-fueling-calc";
import { hasAnyPermission } from "@/lib/permissions";

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** Simplifica Frotas — contratos de combustível (TASK 3A). */
export default function ContractsPage() {
  const { data: me } = useMe();
  const canManage = hasAnyPermission(me, ["fleet:manage"]);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FleetContract | null>(null);
  const [deleting, setDeleting] = useState<FleetContract | null>(null);

  const { data, isLoading, isError } = useFleetContracts({ search: search.trim() || undefined, limit: 100 });
  const deleteContract = useDeleteFleetContract();
  const contracts = data?.data ?? [];

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteContract.mutateAsync(deleting.id);
      toast({ title: `Contrato nº ${deleting.number} excluído.` });
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Contratos de combustível</h1>
          <p className="mt-1 text-sm text-slate-500">
            Preço por litro, posto e saldo. A autorização de abastecimento só é emitida dentro do saldo do contrato.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo contrato
          </Button>
        )}
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          aria-label="Buscar contrato"
          className="pl-9"
          placeholder="Nº do contrato ou fornecedor"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando contratos...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar os contratos. Verifique sua conexão e tente novamente.
        </div>
      )}

      {!isLoading && !isError && contracts.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileSignature className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {search ? "Nenhum contrato encontrado para a busca" : "Nenhum contrato cadastrado"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage
              ? 'Cadastre o contrato do posto para poder emitir autorizações de abastecimento.'
              : "Peça ao gestor de frota para cadastrar o contrato do posto."}
          </p>
        </div>
      )}

      {!isLoading && !isError && contracts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="hidden md:table-cell">Combustível</TableHead>
                <TableHead className="text-right">Preço/L</TableHead>
                <TableHead className="hidden lg:table-cell">Vigência</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Situação</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map(contract => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium text-slate-800">{contract.number}</TableCell>
                  <TableCell className="text-slate-700">
                    {contract.supplierName}
                    <span className="block font-mono text-xs text-slate-500">{formatCnpj(contract.supplierCnpj)}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{FUEL_TYPE_LABELS[contract.fuelType]}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-700">{formatUnitPrice(contract.unitPrice)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-slate-600">
                    {formatIsoDate(contract.startDate)} a {formatIsoDate(contract.endDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="text-slate-800">{formatBrl(contract.availableAmount)}</span>
                    <span className="block text-xs text-slate-500">de {formatBrl(contract.totalAmount)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contract.inForce ? "default" : "secondary"}>{contract.inForce ? "Vigente" : "Fora da vigência"}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar contrato ${contract.number}`}
                          onClick={() => {
                            setEditing(contract);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Excluir contrato ${contract.number}`} onClick={() => setDeleting(contract)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContractFormDialog open={formOpen} onOpenChange={setFormOpen} contract={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir o contrato nº ${deleting?.number ?? ""}?`}
        description="O contrato sai das listas. Autorizações já emitidas continuam apontando para ele."
        confirmLabel="Excluir"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
