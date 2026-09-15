import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CreateHolidayDTO, holidayService } from '@/lib/api/holidays'

const KEY = 'holidays'

export function useHolidays(params?: { year?: number }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => holidayService.list(params),
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHolidayDTO) => holidayService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => holidayService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
