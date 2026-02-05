import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communicationApi, type CreateDocumentDTO } from "@/lib/api/communication"; // Nota: 'type' import explícito
import { useToast } from "@/hooks/use-toast";

// Hook para listar rascunhos
export function useDrafts() {
  return useQuery({
    queryKey: ["communication", "drafts"],
    queryFn: communicationApi.listDrafts,
  });
}

// Hook para listar recebidos
export function useReceivedDocuments() {
  return useQuery({
    queryKey: ["communication", "received"],
    queryFn: communicationApi.listReceived,
  });
}

// Hook para listar enviados
export function useSentDocuments() {
  return useQuery({
    queryKey: ["communication", "sent"],
    queryFn: communicationApi.listSent,
  });
}

// Hook para ver um documento específico
export function useDocument(id: string) {
  return useQuery({
    queryKey: ["communication", "document", id],
    queryFn: () => communicationApi.getById(id),
    enabled: !!id,
  });
}

// Hook para CRIAR (Salvar Rascunho)
export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateDocumentDTO) => communicationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication", "drafts"] });
      toast({
        title: "Rascunho Salvo",
        description: "Documento salvo com sucesso! Você pode continuar editando.",
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao salvar o rascunho.",
        variant: "destructive",
      });
    },
  });
}

// Hook para PROTOCOLAR (Enviar)
export function useSendDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => communicationApi.send(id),
    onSuccess: (data) => {
      // Invalida tudo para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ["communication"] });

      toast({
        title: "Protocolado com Sucesso!",
        description: `Protocolo gerado: ${data.protocol}`,
        // Use variant: "success" se o seu tema suportar, senão "default"
        variant: "default",
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Erro ao Protocolar",
        description: "Não foi possível enviar o documento. Tente novamente.",
        variant: "destructive",
      });
    },
  });
}