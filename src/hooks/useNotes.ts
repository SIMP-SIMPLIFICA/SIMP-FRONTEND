import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notesService, type CreateNoteInput, type UpdateNoteInput } from "@/lib/api/notes";

const QUERY_KEY = ["notes"];

export function useNotes() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notesService.list(),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteInput) => notesService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteInput }) =>
      notesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
