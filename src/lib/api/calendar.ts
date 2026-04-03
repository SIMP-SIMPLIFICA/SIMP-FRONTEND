import { api } from "../api";

export interface CalendarAttachment {
  id: string;
  eventId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string;
  location: string | null;
  userId: string;
  attachments: CalendarAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  color?: string;
  location?: string | null;
  attachments?: { fileName: string; fileUrl: string; fileType: string; fileSize: number }[];
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>;

export const calendarService = {
  list: async (params?: { start?: string; end?: string }) => {
    const query = new URLSearchParams();
    if (params?.start) query.append("start", params.start);
    if (params?.end) query.append("end", params.end);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await api.get<CalendarEvent[]>(`/api/v1/utilities/calendar${qs}`);
    return res.data;
  },

  create: async (data: CreateCalendarEventInput) => {
    const res = await api.post<CalendarEvent>("/api/v1/utilities/calendar", data);
    return res.data;
  },

  update: async (id: string, data: UpdateCalendarEventInput) => {
    const res = await api.put<CalendarEvent>(`/api/v1/utilities/calendar/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/utilities/calendar/${id}`);
  },

  todayAlerts: async () => {
    const res = await api.get<CalendarEvent[]>("/api/v1/utilities/calendar/today-alerts");
    return res.data;
  },
};
