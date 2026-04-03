import { useState, useMemo, useRef, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  startOfYear,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  X,
  CalendarRange,
} from "lucide-react";

import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from "@/hooks/useCalendar";
import type { CalendarEvent, CreateCalendarEventInput } from "@/lib/api/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
type ViewMode = "day" | "week" | "month" | "year";

const VIEW_LABELS: Record<ViewMode, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  year: "Ano",
};

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_LONG  = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_SHORT   = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23
const PX_PER_HOUR = 64; // height of each hour row in px

const COLOR_PALETTE = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#06B6D4", label: "Ciano" },
  { value: "#64748B", label: "Cinza" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DialogMode = "create" | "edit" | "view";

interface FormState {
  title: string;
  description: string;
  date: string;       // yyyy-MM-dd (internal)
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  allDay: boolean;
  color: string;
  location: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  allDay: false,
  color: "#3B82F6",
  location: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Formata data no padrão brasileiro: dd/MM/yyyy */
function formatDateBR(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

/** Formata hora no padrão 24h: HH:mm */
function formatTimeBR(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm");
}

function formToPayload(form: FormState): CreateCalendarEventInput {
  const startAt = form.allDay
    ? new Date(`${form.date}T00:00:00`).toISOString()
    : new Date(`${form.date}T${form.startTime}:00`).toISOString();

  const endAt =
    !form.allDay && form.endTime
      ? new Date(`${form.date}T${form.endTime}:00`).toISOString()
      : null;

  return {
    title: form.title,
    description: form.description || null,
    startAt,
    endAt,
    allDay: form.allDay,
    color: form.color,
    location: form.location || null,
    attachments: [],
  };
}

function eventToForm(event: CalendarEvent): FormState {
  const start = parseISO(event.startAt);
  return {
    title: event.title,
    description: event.description ?? "",
    date: format(start, "yyyy-MM-dd"),
    startTime: event.allDay ? "09:00" : formatTimeBR(start),
    endTime: event.endAt ? formatTimeBR(parseISO(event.endAt)) : "10:00",
    allDay: event.allDay,
    color: event.color,
    location: event.location ?? "",
  };
}

/** Agrupa eventos por dia (chave: yyyy-MM-dd) */
function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = format(parseISO(ev.startAt), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

/** Retorna posição e altura do evento no time grid (em px) */
function eventPosition(event: CalendarEvent): { top: number; height: number } {
  const start = parseISO(event.startAt);
  const top = (getHours(start) + getMinutes(start) / 60) * PX_PER_HOUR;
  const end = event.endAt ? parseISO(event.endAt) : addDays(start, 0);
  const durationMinutes = event.endAt ? differenceInMinutes(end, start) : 60;
  const height = Math.max((durationMinutes / 60) * PX_PER_HOUR, 20);
  return { top, height };
}

// ---------------------------------------------------------------------------
// DatePickerInput — usa react-day-picker via Popover, exibe dd/MM/yyyy
// ---------------------------------------------------------------------------
function DatePickerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0A5BC4]/30"
        >
          <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
          {value ? formatDateBR(value) : <span className="text-slate-400">Selecione uma data</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPickerCalendar
          locale={ptBR}
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// CurrentTimeLine — linha vermelha no time grid
// ---------------------------------------------------------------------------
function CurrentTimeLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const top = (getHours(now) + getMinutes(now) / 60) * PX_PER_HOUR;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top }}>
      <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
      <div className="h-px flex-1 bg-red-500" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventPill — pill colorido para listas e views
// ---------------------------------------------------------------------------
interface EventPillProps {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
  showTime?: boolean;
  compact?: boolean;
}

function EventPill({ event, onClick, showTime = true, compact = false }: EventPillProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full truncate rounded-md text-left font-medium text-white transition-opacity hover:opacity-80 ${
        compact ? "px-1 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
      }`}
      style={{ backgroundColor: event.color }}
    >
      {showTime && !event.allDay && (
        <span className="mr-1 opacity-80">{formatTimeBR(event.startAt)}</span>
      )}
      {event.title}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Month View
// ---------------------------------------------------------------------------
function MonthView({
  currentDate,
  eventsByDay,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 shrink-0">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {d}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={key}
              onClick={() => onDayClick(day)}
              className={`min-h-[90px] cursor-pointer p-1.5 transition-colors hover:bg-slate-50 ${
                !inMonth ? "bg-slate-50/60" : ""
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isCurrentDay
                      ? "bg-[#0A5BC4] text-white"
                      : inMonth ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventPill key={ev.id} event={ev} onClick={(e) => onEventClick(ev, e)} compact />
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------
function WeekView({
  currentDate,
  events,
  onSlotClick,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll para 7h no carregamento
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * PX_PER_HOUR;
  }, []);

  const timedEvents = events.filter((e) => !e.allDay);
  const allDayEvents = events.filter((e) => e.allDay);
  const eventsByDay = groupByDay(timedEvents);
  const allDayByDay = groupByDay(allDayEvents);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header: day columns */}
      <div className="grid shrink-0 border-b border-slate-100" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div /> {/* time label gutter */}
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          return (
            <div key={day.toISOString()} className="border-l border-slate-100 py-2 text-center">
              <p className="text-xs text-slate-400">{WEEKDAYS_SHORT[day.getDay()]}</p>
              <span
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isCurrentDay ? "bg-[#0A5BC4] text-white" : "text-slate-700"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="grid shrink-0 border-b border-slate-100 bg-slate-50" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="flex items-center justify-end pr-2">
            <span className="text-[10px] text-slate-400">todo dia</span>
          </div>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const evs = allDayByDay.get(key) ?? [];
            return (
              <div key={key} className="border-l border-slate-100 px-1 py-1 min-h-[28px]">
                {evs.map((ev) => (
                  <EventPill key={ev.id} event={ev} onClick={(e) => onEventClick(ev, e)} compact showTime={false} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid (scrollable) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ gridTemplateColumns: "56px repeat(7, 1fr)", display: "grid", height: 24 * PX_PER_HOUR }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-slate-400"
                style={{ top: h * PX_PER_HOUR - 7 }}
              >
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvs = eventsByDay.get(key) ?? [];
            const isCurrentDay = isToday(day);

            return (
              <div
                key={key}
                className="relative border-l border-slate-100 cursor-pointer"
                onClick={() => onSlotClick(day)}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: h * PX_PER_HOUR }}
                  />
                ))}

                {/* Current time line */}
                {isCurrentDay && <CurrentTimeLine />}

                {/* Events */}
                {dayEvs.map((ev) => {
                  const { top, height } = eventPosition(ev);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev, e); }}
                      className="absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-white hover:opacity-80 transition-opacity"
                      style={{ top, height, backgroundColor: ev.color, minHeight: 20 }}
                    >
                      <span className="block truncate font-semibold">{ev.title}</span>
                      <span className="block truncate opacity-80 text-[10px]">
                        {formatTimeBR(ev.startAt)}
                        {ev.endAt && ` – ${formatTimeBR(ev.endAt)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day View
// ---------------------------------------------------------------------------
function DayView({
  currentDate,
  events,
  onSlotClick,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * PX_PER_HOUR;
  }, []);

  const key = format(currentDate, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => !e.allDay && isSameDay(parseISO(e.startAt), currentDate));
  const allDayEvents = events.filter((e) => e.allDay && isSameDay(parseISO(e.startAt), currentDate));

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 py-3 px-4 text-center">
        <p className="text-xs text-slate-400 capitalize">{WEEKDAYS_LONG[currentDate.getDay()]}</p>
        <p
          className={`mx-auto mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
            isToday(currentDate) ? "bg-[#0A5BC4] text-white" : "text-slate-700"
          }`}
        >
          {format(currentDate, "d")}
        </p>
        <p className="text-xs text-slate-400 capitalize mt-0.5">
          {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-1.5 flex gap-1.5 flex-wrap">
          {allDayEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={(e) => onEventClick(ev, e)}
              className="rounded-md px-2 py-0.5 text-xs font-medium text-white hover:opacity-80"
              style={{ backgroundColor: ev.color }}
            >
              {ev.title}
            </button>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ display: "grid", gridTemplateColumns: "56px 1fr", height: 24 * PX_PER_HOUR }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-slate-400"
                style={{ top: h * PX_PER_HOUR - 7 }}
              >
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Single day column */}
          <div
            className="relative border-l border-slate-100 cursor-pointer"
            onClick={() => onSlotClick(currentDate)}
            key={key}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: h * PX_PER_HOUR }}
              />
            ))}

            {isToday(currentDate) && <CurrentTimeLine />}

            {dayEvents.map((ev) => {
              const { top, height } = eventPosition(ev);
              return (
                <button
                  key={ev.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick(ev, e); }}
                  className="absolute left-1 right-1 z-10 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-medium text-white hover:opacity-80 transition-opacity"
                  style={{ top, height, backgroundColor: ev.color, minHeight: 20 }}
                >
                  <span className="block truncate font-semibold">{ev.title}</span>
                  <span className="block truncate opacity-80 text-[11px]">
                    {formatTimeBR(ev.startAt)}
                    {ev.endAt && ` – ${formatTimeBR(ev.endAt)}`}
                  </span>
                  {ev.location && (
                    <span className="block truncate opacity-70 text-[10px]">{ev.location}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Year View
// ---------------------------------------------------------------------------
function YearView({
  currentDate,
  eventsByDay,
  onMonthClick,
}: {
  currentDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onMonthClick: (date: Date) => void;
}) {
  const yearStart = startOfYear(currentDate);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const days = eachDayOfInterval({
            start: startOfWeek(monthStart, { weekStartsOn: 0 }),
            end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
          });
          const isCurrentMonth = isSameMonth(month, new Date());

          return (
            <button
              key={month.toISOString()}
              onClick={() => onMonthClick(month)}
              className={`rounded-2xl border p-3 text-left transition-colors hover:border-[#0A5BC4]/30 hover:bg-[#0A5BC4]/5 ${
                isCurrentMonth ? "border-[#0A5BC4]/30 bg-[#0A5BC4]/5" : "border-slate-100 bg-white"
              }`}
            >
              <p
                className={`mb-2 text-sm font-semibold capitalize ${
                  isCurrentMonth ? "text-[#0A5BC4]" : "text-slate-700"
                }`}
              >
                {MONTHS_SHORT[month.getMonth()]}
              </p>

              {/* Mini grid */}
              <div className="grid grid-cols-7 gap-px">
                {["D","S","T","Q","Q","S","S"].map((d, i) => (
                  <div key={i} className="text-center text-[8px] text-slate-300">{d}</div>
                ))}
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const hasEvents = (eventsByDay.get(key)?.length ?? 0) > 0;
                  const isCurrentDay = isToday(day);
                  const inMonth = isSameMonth(day, month);

                  return (
                    <div key={key} className="relative flex items-center justify-center">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                          isCurrentDay
                            ? "bg-[#0A5BC4] font-bold text-white"
                            : inMonth ? "text-slate-600" : "text-slate-200"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {hasEvents && inMonth && !isCurrentDay && (
                        <span className="absolute bottom-0 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-[#0A5BC4]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Dialog
// ---------------------------------------------------------------------------
interface EventDialogProps {
  mode: DialogMode;
  form: FormState;
  event?: CalendarEvent;
  onClose: () => void;
  onFormChange: (f: FormState) => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}

function EventDialog({
  mode, form, event, onClose, onFormChange, onSave, onEdit, onDelete, saving, deleting,
}: EventDialogProps) {
  const set = (field: keyof FormState) => (val: string | boolean) =>
    onFormChange({ ...form, [field]: val });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === "create" ? "Novo evento" : mode === "edit" ? "Editar evento" : event?.title}
            </h2>
            {mode === "view" && event && (
              <p className="mt-0.5 text-sm text-slate-500">
                {format(parseISO(event.startAt), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {mode === "view" && (
              <>
                <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={onDelete} disabled={deleting} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* View mode */}
        {mode === "view" && event && (
          <div className="space-y-3">
            <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: event.color }} />
            {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                {event.allDay ? (
                  <span>Dia inteiro</span>
                ) : (
                  <span>
                    {formatTimeBR(event.startAt)}
                    {event.endAt && ` – ${formatTimeBR(event.endAt)}`}
                  </span>
                )}
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create / Edit form */}
        {(mode === "create" || mode === "edit") && (
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Título</label>
              <Input
                className="h-10 rounded-xl"
                placeholder="Nome do evento"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                autoFocus
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Data</label>
              <DatePickerInput value={form.date} onChange={(v) => set("date")(v)} />
            </div>

            {/* All day toggle */}
            <label className="flex cursor-pointer items-center gap-2.5">
              <div
                onClick={() => set("allDay")(!form.allDay)}
                className={`relative h-5 w-9 rounded-full transition-colors ${form.allDay ? "bg-[#0A5BC4]" : "bg-slate-200"}`}
              >
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.allDay ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-slate-700">Dia inteiro</span>
            </label>

            {/* Time range */}
            {!form.allDay && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Início</label>
                  <Input type="time" className="h-10 rounded-xl" value={form.startTime} onChange={(e) => set("startTime")(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Fim</label>
                  <Input type="time" className="h-10 rounded-xl" value={form.endTime} onChange={(e) => set("endTime")(e.target.value)} />
                </div>
              </div>
            )}

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Local (opcional)</label>
              <Input className="h-10 rounded-xl" placeholder="Ex: Sala de reuniões" value={form.location} onChange={(e) => set("location")(e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Descrição (opcional)</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A5BC4]/30 resize-none"
                rows={2}
                placeholder="Detalhes do evento..."
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => set("color")(c.value)}
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      outline: form.color === c.value ? `3px solid ${c.value}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={onClose}>Cancelar</Button>
              <Button
                className="flex-1 h-10 rounded-xl bg-[#0A5BC4] hover:bg-[#094FA8]"
                onClick={onSave}
                disabled={saving || !form.title || !form.date}
              >
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  : mode === "edit" ? "Salvar alterações" : "Criar evento"
                }
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers de navegação por view
// ---------------------------------------------------------------------------
function navigateDate(date: Date, view: ViewMode, direction: "prev" | "next"): Date {
  if (view === "day")   return direction === "prev" ? subDays(date, 1)   : addDays(date, 1);
  if (view === "week")  return direction === "prev" ? subWeeks(date, 1)  : addWeeks(date, 1);
  if (view === "month") return direction === "prev" ? subMonths(date, 1) : addMonths(date, 1);
  if (view === "year")  return direction === "prev" ? subYears(date, 1)  : addYears(date, 1);
  return date;
}

function headerLabel(date: Date, view: ViewMode): string {
  if (view === "day") {
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }
  if (view === "week") {
    const ws = startOfWeek(date, { weekStartsOn: 0 });
    const we = endOfWeek(date, { weekStartsOn: 0 });
    if (ws.getMonth() === we.getMonth()) {
      return `${format(ws, "d")} – ${format(we, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    }
    return `${format(ws, "d 'de' MMM", { locale: ptBR })} – ${format(we, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
  }
  if (view === "month") {
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  }
  return format(date, "yyyy");
}

/** Calcula o intervalo de datas a buscar para a view atual */
function viewDateRange(date: Date, view: ViewMode): { start: string; end: string } {
  if (view === "day") {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end   = new Date(date); end.setHours(23,59,59,999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (view === "week") {
    return {
      start: startOfWeek(date, { weekStartsOn: 0 }).toISOString(),
      end:   endOfWeek(date,   { weekStartsOn: 0 }).toISOString(),
    };
  }
  if (view === "month") {
    return {
      start: startOfWeek(startOfMonth(date), { weekStartsOn: 0 }).toISOString(),
      end:   endOfWeek(endOfMonth(date),     { weekStartsOn: 0 }).toISOString(),
    };
  }
  // year
  return {
    start: startOfYear(date).toISOString(),
    end:   new Date(date.getFullYear(), 11, 31, 23, 59, 59).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function CalendarPage() {
  const [view, setView]               = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [dialogMode, setDialogMode]   = useState<DialogMode>("create");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);

  const range = useMemo(() => viewDateRange(currentDate, view), [currentDate, view]);

  const { data: events = [], isLoading } = useCalendarEvents({ start: range.start, end: range.end });

  const createMutation = useCreateCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();

  const eventsByDay = useMemo(() => groupByDay(events), [events]);

  function openCreate(date: Date) {
    setForm({ ...EMPTY_FORM, date: format(date, "yyyy-MM-dd") });
    setSelectedEvent(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }

  function openView(event: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedEvent(event);
    setDialogMode("view");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelectedEvent(undefined);
  }

  async function handleSave() {
    if (!form.title || !form.date) return;
    try {
      const payload = formToPayload(form);
      if (dialogMode === "edit" && selectedEvent) {
        await updateMutation.mutateAsync({ id: selectedEvent.id, data: payload });
        toast({ title: "Evento atualizado!" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Evento criado!" });
      }
      closeDialog();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as {message:unknown}).message) : "Não foi possível salvar.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    try {
      await deleteMutation.mutateAsync(selectedEvent.id);
      toast({ title: "Evento excluído." });
      closeDialog();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as {message:unknown}).message) : "Não foi possível excluir.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  }

  function handleEdit() {
    if (!selectedEvent) return;
    setForm(eventToForm(selectedEvent));
    setDialogMode("edit");
  }

  function handleMonthClick(month: Date) {
    setCurrentDate(month);
    setView("month");
  }

  const saving   = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  return (
    <div className="flex h-full flex-col gap-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
        {/* Left: icon + title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A5BC4]/10">
            <CalendarRange className="h-4 w-4 text-[#0A5BC4]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 capitalize">{headerLabel(currentDate, view)}</h1>
            <p className="text-xs text-slate-400">Calendário</p>
          </div>
        </div>

        {/* Center: view switcher */}
        <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 gap-0.5">
          {(["day","week","month","year"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? "bg-white text-[#0A5BC4] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Right: navigation + hoje + novo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setCurrentDate((d) => navigateDate(d, view, "prev"))}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate((d) => navigateDate(d, view, "next"))}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" className="h-9 rounded-xl text-sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>

          <Button size="sm" className="h-9 rounded-xl bg-[#0A5BC4] hover:bg-[#094FA8] gap-1.5" onClick={() => openCreate(new Date())}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo evento</span>
          </Button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <Card className="flex flex-1 flex-col overflow-hidden rounded-none border-0 border-t border-slate-100 shadow-none">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                eventsByDay={eventsByDay}
                onDayClick={openCreate}
                onEventClick={openView}
              />
            )}
            {view === "week" && (
              <WeekView
                currentDate={currentDate}
                events={events}
                onSlotClick={openCreate}
                onEventClick={openView}
              />
            )}
            {view === "day" && (
              <DayView
                currentDate={currentDate}
                events={events}
                onSlotClick={openCreate}
                onEventClick={openView}
              />
            )}
            {view === "year" && (
              <YearView
                currentDate={currentDate}
                eventsByDay={eventsByDay}
                onMonthClick={handleMonthClick}
              />
            )}
          </>
        )}
      </Card>

      {/* ── Dialog ─────────────────────────────────────────────────────── */}
      {dialogOpen && (
        <EventDialog
          mode={dialogMode}
          form={form}
          event={selectedEvent}
          onClose={closeDialog}
          onFormChange={setForm}
          onSave={handleSave}
          onEdit={handleEdit}
          onDelete={handleDelete}
          saving={saving}
          deleting={deleting}
        />
      )}
    </div>
  );
}
