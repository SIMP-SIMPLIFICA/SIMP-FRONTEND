import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarService, type CreateCalendarEventInput, type UpdateCalendarEventInput } from "@/lib/api/calendar";

const QUERY_KEY = ["calendar-events"];

export function useCalendarEvents(params?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params?.start, params?.end],
    queryFn: () => calendarService.list(params),
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCalendarEventInput) => calendarService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCalendarEventInput }) =>
      calendarService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calendarService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useTodayAlerts() {
  return useQuery({
    queryKey: ["calendar-today-alerts"],
    queryFn: () => calendarService.todayAlerts(),
  });
}
