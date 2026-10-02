import { useState } from "react";
import { Tag, Building2, Landmark } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useCovenantTypes, useCreateCovenantType, useDeleteCovenantType,
  useConvenentes, useCreateConvenente, useDeleteConvenente,
  useConcedentes, useCreateConcedente, useDeleteConcedente,
} from "@/hooks/useCovenants";
import type { CovenantType } from "@/lib/api/covenants";
import {
  SimpleFormDialog,
  EntityFormDialog,
  DeleteConfirmDialog,
  ManagerSection,
  ManagerItemRow,
  ManagerEmptyState,
} from "@/components/shared/SimpleEntityManager";

/**
 * Aba "Configurações de Dados" de Convênios (Fase 3) — CRUD (criar/excluir)
 * de Tipo, Convenente e Concedente. As três tabelas e os endpoints já
 * existiam (usados hoje só para criação inline dentro do formulário de
 * convênio); esta aba é a primeira tela de GESTÃO deles — incluindo exclusão,
 * que não tinha lugar nenhum na interface até agora.
 */
export function CovenantSettingsTab() {
  // Tipos
  const { data: types = [], isLoading: loadingTypes } = useCovenantTypes();
  const createType = useCreateCovenantType();
  const deleteType = useDeleteCovenantType();

  // Convenentes
  const { data: convenentes = [], isLoading: loadingConvenentes } = useConvenentes();
  const createConvenente = useCreateConvenente();
  const deleteConvenente = useDeleteConvenente();

  // Concedentes
  const { data: concedentes = [], isLoading: loadingConcedentes } = useConcedentes();
  const createConcedente = useCreateConcedente();
  const deleteConcedente = useDeleteConcedente();

  // Nenhum dos três (Type/Convenente/Concedente) tem endpoint de ATUALIZAÇÃO
  // no backend — só listar/criar/excluir (`covenant.routes.ts`: só GET/POST/
  // DELETE nas três sub-rotas). O pedido original também foi literal:
  // "CRUD (adicionar/deletar)". Por isso os dialogs abaixo nunca recebem um
  // `item` não-nulo, e `ManagerItemRow` nem mostra o lápis de editar aqui —
  // simular "editar" chamando `create` de novo criaria uma duplicata, não
  // atualizaria o registro.
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [convenenteDialogOpen, setConvenenteDialogOpen] = useState(false);
  const [concedenteDialogOpen, setConcedenteDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; fn: (() => void) | null }>({ open: false, fn: null });

  function openDelete(fn: () => void) {
    setDeleteDialog({ open: true, fn });
  }

  function confirmDelete() {
    deleteDialog.fn?.();
    setDeleteDialog({ open: false, fn: null });
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Configurações de Dados</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie as opções de Tipo, Convenente e Concedente usadas no cadastro de convênios.
        </p>
      </div>

      <ManagerSection
        title="Tipos de Convênio"
        description="Ex: Emenda Especial, Convênio Federal…"
        icon={<Tag className="h-4 w-4 text-blue-500" />}
        isLoading={loadingTypes}
        onNew={() => setTypeDialogOpen(true)}
        newLabel="Novo"
      >
        {types.length === 0 ? <ManagerEmptyState label="tipo" /> : (
          <div className="divide-y divide-slate-100">
            {types.map((t: CovenantType) => (
              <ManagerItemRow
                key={t.id}
                primary={t.name}
                onDelete={() => openDelete(() => deleteType.mutate(t.id, {
                  onSuccess: () => toast({ title: "Tipo removido" }),
                  onError: () => toast({ title: "Erro ao remover tipo", description: "Verifique se algum convênio ainda usa este tipo.", variant: "destructive" }),
                }))}
              />
            ))}
          </div>
        )}
      </ManagerSection>

      <ManagerSection
        title="Convenentes"
        description="Quem recebe o recurso"
        icon={<Building2 className="h-4 w-4 text-emerald-500" />}
        isLoading={loadingConvenentes}
        onNew={() => setConvenenteDialogOpen(true)}
        newLabel="Novo"
      >
        {convenentes.length === 0 ? <ManagerEmptyState label="convenente" /> : (
          <div className="divide-y divide-slate-100">
            {convenentes.map(c => (
              <ManagerItemRow
                key={c.id}
                primary={c.name}
                secondary={c.cnpj}
                onDelete={() => openDelete(() => deleteConvenente.mutate(c.id, {
                  onSuccess: () => toast({ title: "Convenente removido" }),
                  onError: () => toast({ title: "Erro ao remover convenente", description: "Verifique se algum convênio ainda usa este registro.", variant: "destructive" }),
                }))}
              />
            ))}
          </div>
        )}
      </ManagerSection>

      <ManagerSection
        title="Concedentes"
        description="Quem transfere o recurso"
        icon={<Landmark className="h-4 w-4 text-violet-500" />}
        isLoading={loadingConcedentes}
        onNew={() => setConcedenteDialogOpen(true)}
        newLabel="Novo"
      >
        {concedentes.length === 0 ? <ManagerEmptyState label="concedente" /> : (
          <div className="divide-y divide-slate-100">
            {concedentes.map(c => (
              <ManagerItemRow
                key={c.id}
                primary={c.name}
                secondary={c.cnpj}
                onDelete={() => openDelete(() => deleteConcedente.mutate(c.id, {
                  onSuccess: () => toast({ title: "Concedente removido" }),
                  onError: () => toast({ title: "Erro ao remover concedente", description: "Verifique se algum convênio ainda usa este registro.", variant: "destructive" }),
                }))}
              />
            ))}
          </div>
        )}
      </ManagerSection>

      <SimpleFormDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        item={null}
        label="Tipo"
        placeholder="Ex: Emenda Especial"
        existingNames={types.map(t => t.name)}
        onSave={async name => {
          await createType.mutateAsync(name);
          toast({ title: "Tipo criado com sucesso" });
        }}
        onError={() => toast({ title: "Erro ao criar tipo", variant: "destructive" })}
      />

      <EntityFormDialog
        open={convenenteDialogOpen}
        onOpenChange={setConvenenteDialogOpen}
        item={null}
        label="Convenente"
        existingEntities={convenentes}
        onSave={async data => {
          await createConvenente.mutateAsync({ name: data.name, cnpj: data.cnpj ?? undefined });
          toast({ title: "Convenente criado com sucesso" });
        }}
        onError={() => toast({ title: "Erro ao criar convenente", variant: "destructive" })}
      />

      <EntityFormDialog
        open={concedenteDialogOpen}
        onOpenChange={setConcedenteDialogOpen}
        item={null}
        label="Concedente"
        existingEntities={concedentes}
        onSave={async data => {
          await createConcedente.mutateAsync({ name: data.name, cnpj: data.cnpj ?? undefined });
          toast({ title: "Concedente criado com sucesso" });
        }}
        onError={() => toast({ title: "Erro ao criar concedente", variant: "destructive" })}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={v => setDeleteDialog(d => ({ ...d, open: v }))}
        onConfirm={confirmDelete}
        loading={deleteType.isPending || deleteConvenente.isPending || deleteConcedente.isPending}
      />
    </div>
  );
}
