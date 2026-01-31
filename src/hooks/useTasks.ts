import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/lib/api/tasks";
import { 
  type CreateTaskDTO, 
  type UpdateTaskDTO, 
  type Task, 
  type TaskDetails 
} from "@/types/task";

// --- LISTAGEM E CRIAÇÃO (KANBAN) ---

export function useWorkspaceTasks(workspaceId: string | undefined) {
  return useQuery<Task[]>({
    queryKey: ["tasks", workspaceId],
    queryFn: () => {
      if (!workspaceId) throw new Error("Workspace ID required");
      return taskService.getByWorkspace(workspaceId);
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDTO) => taskService.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

// --- AÇÕES DE TAREFA ---

export function useUpdateTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskDTO) => taskService.update(data.id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
    },
  });
}

export function useDeleteTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskService.delete(taskId), 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

// --- DETALHES ---

export function useTaskDetails(taskId: string | null) {
  return useQuery<TaskDetails>({
    queryKey: ["task", taskId],
    queryFn: () => taskService.getDetails(taskId!),
    enabled: !!taskId,
  });
}

// --- SUB-RECURSOS (Checklist, Notas, Anexos) ---

export function useChecklistOperations(taskId: string) {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: (title: string) => taskService.addChecklistItem(taskId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  const toggle = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) => 
      taskService.updateChecklistItem(itemId, isDone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  return { add, toggle };
}

export function useTaskNotes(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => taskService.addNote(taskId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
  });
}

export function useAttachments(taskId: string) {
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => taskService.uploadAttachment(taskId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  const remove = useMutation({
    mutationFn: (attachmentId: string) => taskService.deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  return { upload, remove };
}