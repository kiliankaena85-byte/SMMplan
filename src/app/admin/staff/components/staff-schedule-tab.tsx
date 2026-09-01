'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { 
  getMonthShiftsAction, 
  assignShiftAction, 
  swapShiftAction, 
  deleteShiftAction,
  requestTimeOffAction,
  applyShiftTemplateAction,
  getAvailableSubstitutesAction,
  AvailableSubstituteDTO,
  StaffScheduleRow,
  StaffMemberOption,
  ShiftInfo
} from '@/actions/admin/shifts';
import { formatRubles } from '@/utils/format-price';
import { 
  Calendar as CalendarIcon, 
  Sun, 
  Moon, 
  RefreshCw, 
  ArrowLeftRight, 
  Palmtree, 
  HeartPulse, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  SlidersHorizontal,
  Clock,
  UserCheck,
  User,
  Shield,
  Trash2,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  LayoutGrid,
  CalendarRange,
  Coffee
} from 'lucide-react';
import { toast } from 'sonner';

interface StaffScheduleTabProps {
  initialRows?: StaffScheduleRow[];
  initialYear?: number;
  initialMonth?: number;
  currentUserRole: string;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function formatOperatorLabel(email?: string | null): string {
  if (!email) return '—';
  const prefix = email.split('@')[0];
  if (prefix.startsWith('support_a_')) {
    return `Саппорт #${prefix.slice(-4)}`;
  }
  if (prefix.length > 16) {
    return `${prefix.slice(0, 14)}...`;
  }
  return prefix;
}

export function StaffScheduleTab({
  currentUserRole,
}: StaffScheduleTabProps) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1..12
  const [scheduleRows, setScheduleRows] = useState<StaffScheduleRow[]>([]);
  const [staffList, setStaffList] = useState<StaffMemberOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // View modes: 'calendar' (7x5 Month Grid), 'timetable' (Week Schedule), 'my_shifts' (Personal Operator View)
  const [viewMode, setViewMode] = useState<'calendar' | 'timetable' | 'my_shifts'>('calendar');
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState(1);

  // Modals state
  const [selectedShiftModal, setSelectedShiftModal] = useState<{
    staff?: StaffScheduleRow;
    day: number;
    shift?: ShiftInfo;
    isNew?: boolean;
  } | null>(null);

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateUserId, setTemplateUserId] = useState<string>('');
  const [templateType, setTemplateType] = useState<'2_2_DAY' | '2_2_NIGHT' | '5_2' | 'DAILY'>('2_2_DAY');
  const [templateStartDay, setTemplateStartDay] = useState(1);
  const [templateRate, setTemplateRate] = useState(2500);

  // Swap Modal & Collision Poka-Yoke
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapShift, setSwapShift] = useState<ShiftInfo | null>(null);
  const [substituteUserId, setSubstituteUserId] = useState<string>('');
  const [swapHours, setSwapHours] = useState<number>(0);
  const [swapNotes, setSwapNotes] = useState<string>('');
  const [substituteCandidates, setSubstituteCandidates] = useState<AvailableSubstituteDTO[]>([]);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState<boolean>(false);
  const [isReciprocalSwap, setIsReciprocalSwap] = useState<boolean>(false);
  const [reciprocalShiftId, setReciprocalShiftId] = useState<string>('');

  // Time Off Modal
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [timeOffUserId, setTimeOffUserId] = useState<string>('');
  const [timeOffType, setTimeOffType] = useState<'VACATION' | 'SICK' | 'DAY_OFF'>('VACATION');
  const [timeOffDateFrom, setTimeOffDateFrom] = useState('');
  const [timeOffDateTo, setTimeOffDateTo] = useState('');
  const [timeOffNotes, setTimeOffNotes] = useState('');

  // Fetch Month Schedule
  const loadMonthData = async (y: number, m: number) => {
    setIsLoading(true);
    try {
      const res = await getMonthShiftsAction(y, m);
      if (res.success) {
        setScheduleRows(res.rows);
        setDaysInMonth(res.daysInMonth);
        setStaffList(res.staffList || []);
        if (res.currentUserId) setCurrentUserId(res.currentUserId);
      }
    } catch {
      toast.error('Не удалось загрузить график смен');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Quick Shift Assignment
  const handleAssignShift = (
    userId: string,
    day: number,
    shiftType: 'DAY' | 'NIGHT' | 'CUSTOM',
    status: 'PLANNED' | 'VACATION' | 'SICK' | 'DAY_OFF',
    rate = 2500,
    notes = ''
  ) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(currentMonth).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    startTransition(async () => {
      try {
        const res = await assignShiftAction({
          userId,
          dateStr,
          shiftType,
          status,
          rateRubles: rate,
          notes,
        });

        if (res.success) {
          toast.success('Смена сохранена');
          loadMonthData(currentYear, currentMonth);
          setSelectedShiftModal(null);
        } else {
          toast.error(res.error || 'Ошибка назначения');
        }
      } catch {
        toast.error('Сбой при сохранении');
      }
    });
  };

  // Delete Shift
  const handleDeleteShift = (shiftId: string) => {
    startTransition(async () => {
      try {
        const res = await deleteShiftAction(shiftId);
        if (res.success) {
          toast.success('Смена удалена');
          loadMonthData(currentYear, currentMonth);
          setSelectedShiftModal(null);
        } else {
          toast.error(res.error || 'Ошибка удаления');
        }
      } catch {
        toast.error('Сбой при удалении');
      }
    });
  };

  // Apply Template
  const handleApplyTemplate = () => {
    if (!templateUserId) {
      toast.error('Выберите сотрудника');
      return;
    }

    startTransition(async () => {
      try {
        const res = await applyShiftTemplateAction({
          userId: templateUserId,
          year: currentYear,
          month: currentMonth,
          templateType,
          startDay: templateStartDay,
          rateRubles: templateRate,
        });

        if (res.success) {
          toast.success(`График успешно применен (${res.createdCount} смен)`);
          setIsTemplateModalOpen(false);
          loadMonthData(currentYear, currentMonth);
        } else {
          toast.error(res.error || 'Ошибка применения шаблона');
        }
      } catch {
        toast.error('Сбой при применении');
      }
    });
  };

  // Open Swap Modal & Load Candidate Availability
  const handleOpenSwapModal = async (shift: ShiftInfo) => {
    setSwapShift(shift);
    setSubstituteUserId('');
    setSwapHours(0);
    setSwapNotes('');
    setIsReciprocalSwap(false);
    setReciprocalShiftId('');
    setIsSwapModalOpen(true);
    setIsCandidatesLoading(true);

    try {
      const res = await getAvailableSubstitutesAction(shift.id);
      if (res.success && res.candidates) {
        setSubstituteCandidates(res.candidates);
      }
    } catch {
      toast.error('Не удалось загрузить доступность коллег');
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  // Execute Swap
  const handleExecuteSwap = () => {
    if (!swapShift || !substituteUserId || !swapNotes) {
      toast.error('Заполните все обязательные поля подмены');
      return;
    }

    if (isReciprocalSwap && !reciprocalShiftId) {
      toast.error('Выберите встречную смену коллеги для взаимного обмена');
      return;
    }

    startTransition(async () => {
      try {
        const res = await swapShiftAction({
          shiftId: swapShift.id,
          substituteUserId,
          substituteHours: swapHours,
          reciprocalShiftId: isReciprocalSwap && reciprocalShiftId ? reciprocalShiftId : undefined,
          notes: swapNotes,
        });

        if (res.success) {
          toast.success(isReciprocalSwap ? 'Взаимный обмен сменами зафиксирован' : 'Подмена успешно зафиксирована');
          setIsSwapModalOpen(false);
          setSwapShift(null);
          loadMonthData(currentYear, currentMonth);
        } else {
          toast.error(res.error || 'Ошибка подмены');
        }
      } catch {
        toast.error('Сбой при фиксации');
      }
    });
  };

  // Submit Time Off Request
  const handleTimeOffSubmit = () => {
    if (!timeOffUserId || !timeOffDateFrom || !timeOffDateTo) {
      toast.error('Укажите сотрудника и даты');
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestTimeOffAction({
          userId: timeOffUserId,
          dateFromStr: timeOffDateFrom,
          dateToStr: timeOffDateTo,
          status: timeOffType,
          notes: timeOffNotes,
        });

        if (res.success) {
          toast.success(`Заявка оформлена (${res.daysCount} дней)`);
          setIsTimeOffModalOpen(false);
          loadMonthData(currentYear, currentMonth);
        } else {
          toast.error(res.error || 'Ошибка оформления');
        }
      } catch {
        toast.error('Сбой при оформлении');
      }
    });
  };

  // Aggregate shifts by Day Number (1..31) for Month Grid and Timetable
  const dayShiftsMap = useMemo(() => {
    const map: Record<number, ShiftInfo[]> = {};
    for (let d = 1; d <= daysInMonth; d++) map[d] = [];

    scheduleRows.forEach((row) => {
      Object.values(row.shifts).forEach((s) => {
        if (!map[s.dayNumber]) map[s.dayNumber] = [];
        map[s.dayNumber].push(s);
      });
    });
    return map;
  }, [scheduleRows, daysInMonth]);

  // Coverage statistics: check how many days have 0 day shift or 0 night shift
  const coverageStats = useMemo(() => {
    let unstaffedDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayList = dayShiftsMap[d] || [];
      const hasDay = dayList.some(s => s.shiftType === 'DAY' && ['PLANNED', 'COMPLETED', 'SWAPPED'].includes(s.status));
      const hasNight = dayList.some(s => s.shiftType === 'NIGHT' && ['PLANNED', 'COMPLETED', 'SWAPPED'].includes(s.status));
      if (!hasDay || !hasNight) unstaffedDays++;
    }
    return {
      unstaffedDays,
      totalDays: daysInMonth,
      coveragePercent: Math.round(((daysInMonth - unstaffedDays) / daysInMonth) * 100),
    };
  }, [dayShiftsMap, daysInMonth]);

  // Current logged in operator shifts
  const myRow = useMemo(() => {
    return scheduleRows.find(r => r.userId === currentUserId);
  }, [scheduleRows, currentUserId]);

  const myShiftsList = useMemo(() => {
    if (!myRow) return [];
    return Object.values(myRow.shifts).sort((a, b) => a.dayNumber - b.dayNumber);
  }, [myRow]);

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1).getDay();
    return (d + 6) % 7; // Convert to Mon=0, Sun=6
  }, [currentYear, currentMonth]);

  return (
    <div className="space-y-5 w-full">
      {/* ── TOP BAR: Navigation, View Mode & Action Buttons ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-3.5 shadow-xs">
        
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs sm:text-sm text-foreground px-3 min-w-[130px] text-center font-mono">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => loadMonthData(currentYear, currentMonth)}
            disabled={isLoading || isPending}
            className="p-2 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Обновить данные"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* View Switcher: Calendar / Timetable / My Shifts */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'calendar'
                ? 'bg-card text-foreground shadow-2xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            <span>Сетка месяца</span>
          </button>

          <button
            onClick={() => setViewMode('timetable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'timetable'
                ? 'bg-card text-foreground shadow-2xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
            <span>Расписание недели</span>
          </button>

          <button
            onClick={() => setViewMode('my_shifts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'my_shifts'
                ? 'bg-card text-foreground shadow-2xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-500" />
            <span>Мой график</span>
          </button>
        </div>

        {/* Action Buttons: Template, Time Off, Shift Request */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setTimeOffUserId(currentUserId || staffList[0]?.id || '');
              setTimeOffDateFrom(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`);
              setTimeOffDateTo(`${currentYear}-${String(currentMonth).padStart(2, '0')}-05`);
              setIsTimeOffModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border/70 bg-card hover:bg-muted text-foreground flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Palmtree className="w-3.5 h-3.5 text-emerald-500" />
            <span>Отпуск / Больничный</span>
          </button>

          {['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole) && (
            <button
              onClick={() => {
                if (staffList.length > 0) setTemplateUserId(staffList[0].id);
                setIsTemplateModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Авто-шаблон (2/2, 5/2)</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 24/7 COVERAGE STRIP ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card/70 border border-border/70 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Всего смен в месяце</div>
              <div className="text-sm font-bold font-mono text-foreground">
                {Object.values(dayShiftsMap).reduce((acc, list) => acc + list.length, 0)} смен
              </div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">{daysInMonth} календарных дней</span>
        </div>

        <div className="bg-card/70 border border-border/70 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${coverageStats.unstaffedDays === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Покрытие 24/7</div>
              <div className={`text-sm font-bold font-mono ${coverageStats.unstaffedDays === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {coverageStats.coveragePercent}% укомплектовано
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            {coverageStats.unstaffedDays === 0 ? 'Без пробелов' : `⚠️ ${coverageStats.unstaffedDays} смен без дежурного`}
          </span>
        </div>

        <div className="bg-card/70 border border-border/70 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Биржа подмен саппорта</div>
              <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {scheduleRows.reduce((acc, r) => acc + r.swappedCount, 0)} передано
              </div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Взаимовыручка</span>
        </div>
      </div>

      {/* ── VIEW 1: MONTH GRID (7x5 Calendar) ── */}
      {viewMode === 'calendar' && (
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-border/70 bg-muted/30 text-center font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-2">
            {WEEKDAY_NAMES.map((wd, i) => (
              <div key={wd} className={i >= 5 ? 'text-rose-500' : ''}>{wd}</div>
            ))}
          </div>

          {/* 7x5 Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/40 bg-background/50">
            {/* Empty Offset Days from Previous Month */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`offset-${idx}`} className="min-h-[100px] p-1.5 bg-muted/10 opacity-30 select-none" />
            ))}

            {/* Days of Current Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isToday = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth && now.getDate() === day;
              const shiftsOnDay = dayShiftsMap[day] || [];
              const dayOfWeek = (firstDayOfMonth + idx) % 7;
              const isWeekend = dayOfWeek >= 5;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-[110px] p-1.5 flex flex-col justify-between transition-colors hover:bg-muted/20 relative group ${
                    isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : ''
                  }`}
                >
                  {/* Day Header & Plus Button */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-mono font-bold w-5 h-5 flex items-center justify-center rounded-md ${
                      isToday
                        ? 'bg-primary text-primary-foreground font-black'
                        : isWeekend
                        ? 'text-rose-500'
                        : 'text-foreground'
                    }`}>
                      {day}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedShiftModal({ day, isNew: true })}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
                      title="Добавить смену"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Shifts List for Day */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {shiftsOnDay.map((shift) => {
                      const isDayShift = shift.shiftType === 'DAY';
                      const isNightShift = shift.shiftType === 'NIGHT';
                      const isVacation = shift.status === 'VACATION';
                      const isSick = shift.status === 'SICK';
                      const isSwapped = shift.status === 'SWAPPED';
                      const isMyShift = shift.userId === currentUserId;

                      return (
                        <button
                          key={shift.id}
                          type="button"
                          onClick={() => setSelectedShiftModal({ day, shift })}
                          className={`w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer truncate flex items-center gap-1 ${
                            isVacation
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : isSick
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : isSwapped
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : isDayShift
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                          } ${isMyShift ? 'ring-1 ring-primary font-black shadow-2xs' : ''}`}
                          title={`${shift.userEmail} (${shift.shiftType} / ${shift.status})`}
                        >
                          {isVacation ? (
                            <Palmtree className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                          ) : isSick ? (
                            <HeartPulse className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                          ) : isSwapped ? (
                            <ArrowLeftRight className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                          ) : isDayShift ? (
                            <Sun className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                          ) : (
                            <Moon className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                          )}
                          <span className="truncate">{formatOperatorLabel(shift.userEmail)}</span>
                          {isSwapped && shift.substituteUserEmail && (
                            <span className="text-[8px] opacity-75">→{formatOperatorLabel(shift.substituteUserEmail)}</span>
                          )}
                        </button>
                      );
                    })}

                    {shiftsOnDay.length === 0 && (
                      <div
                        onClick={() => setSelectedShiftModal({ day, isNew: true })}
                        className="h-8 border border-dashed border-border/40 rounded-md flex items-center justify-center text-[10px] text-muted-foreground/40 hover:text-muted-foreground hover:border-border cursor-pointer transition-colors"
                      >
                        + Смена
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: TIMETABLE (Week Schedule / Расписание пар) ── */}
      {viewMode === 'timetable' && (
        <div className="space-y-4">
          {/* Week Selector Bar with Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>Неделя {Math.ceil(selectedWeekStartDay / 7)}</span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    ({selectedWeekStartDay} – {Math.min(selectedWeekStartDay + 6, daysInMonth)} {MONTH_NAMES[currentMonth - 1]} {currentYear})
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Табель дежурств и расписание пар операторов саппорта
                </div>
              </div>
            </div>

            {/* Week Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              {[1, 8, 15, 22, 29].filter(d => d <= daysInMonth).map((startDay, idx) => {
                const endDay = Math.min(startDay + 6, daysInMonth);
                const isActive = selectedWeekStartDay === startDay;
                return (
                  <button
                    key={startDay}
                    type="button"
                    onClick={() => setSelectedWeekStartDay(startDay)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                        : 'bg-background text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    Неделя {idx + 1} ({startDay}–{endDay} {MONTH_NAMES[currentMonth - 1].slice(0, 3)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekly Timetable Matrix Table — 100% Zero Overflow & Clean Academic Grid */}
          <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse table-fixed min-w-[840px]">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground">
                    <th className="w-[140px] px-3 py-3 border-r border-border/50 text-foreground bg-muted/60">
                      Смена / Время
                    </th>
                    {Array.from({ length: 7 }).map((_, offset) => {
                      const day = selectedWeekStartDay + offset;
                      if (day > daysInMonth) {
                        return <th key={`header-empty-${offset}`} className="px-2 py-3 border-r border-border/40 bg-muted/10 opacity-30 text-center">-</th>;
                      }
                      const dayOfWeek = (firstDayOfMonth + (day - 1)) % 7;
                      const isWeekend = dayOfWeek >= 5;
                      const isToday = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth && now.getDate() === day;

                      return (
                        <th
                          key={`header-day-${day}`}
                          className={`px-2.5 py-3 border-r border-border/40 text-center transition-colors ${
                            isToday ? 'bg-primary/10 text-primary font-black' : isWeekend ? 'text-rose-500 bg-muted/20' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] tracking-wider uppercase font-extrabold">{WEEKDAY_NAMES[dayOfWeek]}</span>
                            <span className={`text-sm font-mono font-bold mt-0.5 px-2 py-0.5 rounded-md ${
                              isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                            }`}>
                              {day} {MONTH_NAMES[currentMonth - 1].slice(0, 3)}
                            </span>
                            {isToday && (
                              <span className="text-[9px] font-black uppercase text-primary tracking-widest mt-0.5">Сегодня</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {/* Row 1: DAY SHIFT */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-3.5 border-r border-border/50 bg-amber-500/5 align-top">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                        <Sun className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                        <span>Дневная</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground font-semibold">09:00 – 21:00</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">12 часов</div>
                    </td>

                    {Array.from({ length: 7 }).map((_, offset) => {
                      const day = selectedWeekStartDay + offset;
                      if (day > daysInMonth) {
                        return <td key={`day-empty-${offset}`} className="px-2 py-3 border-r border-border/40 bg-muted/10 opacity-30" />;
                      }
                      const shifts = dayShiftsMap[day] || [];
                      const dayShifts = shifts.filter(s => s.shiftType === 'DAY' && s.status !== 'VACATION' && s.status !== 'SICK');
                      const isToday = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth && now.getDate() === day;

                      return (
                        <td
                          key={`cell-day-${day}`}
                          className={`px-2 py-2.5 border-r border-border/40 align-top transition-colors ${
                            isToday ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="space-y-1.5 min-h-[70px] flex flex-col justify-between">
                            <div className="space-y-1">
                              {dayShifts.map((shift) => {
                                const isMyShift = shift.userId === currentUserId;
                                const isSwapped = shift.status === 'SWAPPED';
                                const label = formatOperatorLabel(shift.userEmail);

                                return (
                                  <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() => setSelectedShiftModal({ day, shift })}
                                    className={`w-full text-left p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-[1.02] flex items-center justify-between gap-1.5 ${
                                      isSwapped
                                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                        : 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/25'
                                    } ${isMyShift ? 'ring-1.5 ring-primary font-black shadow-xs' : ''}`}
                                    title={`${shift.userEmail} (Дневная смена)`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-900 dark:text-amber-100 flex items-center justify-center text-[10px] font-black shrink-0">
                                        {label.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="truncate">
                                        <div className="truncate">{label}</div>
                                        {isSwapped && shift.substituteUserEmail && (
                                          <div className="text-[9px] text-blue-600 dark:text-blue-400 font-normal truncate">
                                            ⇄ {formatOperatorLabel(shift.substituteUserEmail)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedShiftModal({ day, isNew: true })}
                              className="w-full py-1 text-center text-[10px] font-bold text-muted-foreground/60 hover:text-amber-600 dark:hover:text-amber-400 border border-dashed border-border/60 hover:border-amber-500/50 rounded-lg hover:bg-amber-500/5 transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{dayShifts.length > 0 ? '+ Еще' : 'Назначить'}</span>
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 2: NIGHT SHIFT */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-3.5 border-r border-border/50 bg-indigo-500/5 align-top">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                        <Moon className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span>Ночная</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground font-semibold">21:00 – 09:00</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">12 часов</div>
                    </td>

                    {Array.from({ length: 7 }).map((_, offset) => {
                      const day = selectedWeekStartDay + offset;
                      if (day > daysInMonth) {
                        return <td key={`night-empty-${offset}`} className="px-2 py-3 border-r border-border/40 bg-muted/10 opacity-30" />;
                      }
                      const shifts = dayShiftsMap[day] || [];
                      const nightShifts = shifts.filter(s => s.shiftType === 'NIGHT' && s.status !== 'VACATION' && s.status !== 'SICK');
                      const isToday = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth && now.getDate() === day;

                      return (
                        <td
                          key={`cell-night-${day}`}
                          className={`px-2 py-2.5 border-r border-border/40 align-top transition-colors ${
                            isToday ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="space-y-1.5 min-h-[70px] flex flex-col justify-between">
                            <div className="space-y-1">
                              {nightShifts.map((shift) => {
                                const isMyShift = shift.userId === currentUserId;
                                const isSwapped = shift.status === 'SWAPPED';
                                const label = formatOperatorLabel(shift.userEmail);

                                return (
                                  <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() => setSelectedShiftModal({ day, shift })}
                                    className={`w-full text-left p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-[1.02] flex items-center justify-between gap-1.5 ${
                                      isSwapped
                                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                        : 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/30 hover:bg-indigo-500/25'
                                    } ${isMyShift ? 'ring-1.5 ring-primary font-black shadow-xs' : ''}`}
                                    title={`${shift.userEmail} (Ночная смена)`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-900 dark:text-indigo-100 flex items-center justify-center text-[10px] font-black shrink-0">
                                        {label.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="truncate">
                                        <div className="truncate">{label}</div>
                                        {isSwapped && shift.substituteUserEmail && (
                                          <div className="text-[9px] text-blue-600 dark:text-blue-400 font-normal truncate">
                                            ⇄ {formatOperatorLabel(shift.substituteUserEmail)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedShiftModal({ day, isNew: true })}
                              className="w-full py-1 text-center text-[10px] font-bold text-muted-foreground/60 hover:text-indigo-600 dark:hover:text-indigo-400 border border-dashed border-border/60 hover:border-indigo-500/50 rounded-lg hover:bg-indigo-500/5 transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{nightShifts.length > 0 ? '+ Еще' : 'Назначить'}</span>
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 3: LEAVES & SICK DAYS */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-3 border-r border-border/50 bg-emerald-500/5 align-top">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        <Palmtree className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>Отсутствия</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Отпуска / Больничные</div>
                    </td>

                    {Array.from({ length: 7 }).map((_, offset) => {
                      const day = selectedWeekStartDay + offset;
                      if (day > daysInMonth) {
                        return <td key={`leave-empty-${offset}`} className="px-2 py-3 border-r border-border/40 bg-muted/10 opacity-30" />;
                      }
                      const shifts = dayShiftsMap[day] || [];
                      const leaves = shifts.filter(s => ['VACATION', 'SICK', 'DAY_OFF'].includes(s.status));
                      const isToday = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth && now.getDate() === day;

                      return (
                        <td
                          key={`cell-leave-${day}`}
                          className={`px-2 py-2 border-r border-border/40 align-top transition-colors ${
                            isToday ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="space-y-1 min-h-[40px]">
                            {leaves.map((l) => {
                              const isVac = l.status === 'VACATION';
                              const isSick = l.status === 'SICK';
                              const label = formatOperatorLabel(l.userEmail);

                              return (
                                <div
                                  key={l.id}
                                  onClick={() => setSelectedShiftModal({ day, shift: l })}
                                  className={`p-1 rounded-lg text-[10px] font-bold border truncate flex items-center gap-1 cursor-pointer transition-colors ${
                                    isVac
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                      : isSick
                                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                                      : 'bg-muted text-muted-foreground border-border/50'
                                  }`}
                                  title={`${l.userEmail} (${l.status})`}
                                >
                                  <span>{isVac ? '🌴' : isSick ? '🩹' : '☕'}</span>
                                  <span className="truncate">{label}</span>
                                </div>
                              );
                            })}
                            {leaves.length === 0 && (
                              <div className="text-[10px] text-muted-foreground/40 text-center py-2 select-none">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 3: MY SHIFTS (Personal Operator Dashboard) ── */}
      {viewMode === 'my_shifts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Моих смен в этом месяце</div>
              <div className="text-2xl font-black font-mono text-primary mt-1">{myShiftsList.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">По расписанию</div>
            </div>

            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Отработано часов</div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {myShiftsList.length * 12} ч
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">12 ч / смена</div>
            </div>

            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Подмен оформлено</div>
              <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                {myShiftsList.filter(s => s.status === 'SWAPPED').length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Взаимовыручка</div>
            </div>

            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Оплата за смены (план)</div>
              <div className="text-2xl font-black font-mono text-foreground mt-1">
                {formatRubles(myShiftsList.reduce((acc, s) => acc + s.rateRubles, 0))}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">До учета бонусов и KPI</div>
            </div>
          </div>

          {/* Upcoming Shifts Table */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Список моих рабочих смен на {MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
            </h3>

            {myShiftsList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                У вас пока нет запланированных смен на этот месяц
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {myShiftsList.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border/50 flex flex-col items-center justify-center font-mono">
                        <span className="text-xs font-black">{s.dayNumber}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{MONTH_NAMES[currentMonth - 1].slice(0, 3)}</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {s.shiftType === 'DAY' ? '☀️ Дневная смена (09:00 – 21:00)' : '🌙 Ночная смена (21:00 – 09:00)'}
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {s.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Ставка: {formatRubles(s.rateRubles)} {s.notes ? `• ${s.notes}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenSwapModal(s)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border/70 hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-blue-500" />
                        <span>Передать коллеге</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: Shift Details / Quick Assign ── */}
      {selectedShiftModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>
                  {selectedShiftModal.shift ? 'Редактирование смены' : 'Назначение смены'} — {selectedShiftModal.day} {MONTH_NAMES[currentMonth - 1]}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedShiftModal(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const userId = (formData.get('userId') as string) || currentUserId || staffList[0]?.id;
                const shiftType = formData.get('shiftType') as 'DAY' | 'NIGHT' | 'CUSTOM';
                const status = formData.get('status') as 'PLANNED' | 'VACATION' | 'SICK' | 'DAY_OFF';
                const rate = Number(formData.get('rate')) || 2500;
                const notes = formData.get('notes') as string;

                handleAssignShift(userId, selectedShiftModal.day, shiftType, status, rate, notes);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-muted-foreground mb-1">Сотрудник:</label>
                <select
                  name="userId"
                  defaultValue={selectedShiftModal.shift?.userId || currentUserId || staffList[0]?.id}
                  disabled={!['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole)}
                  className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.email} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Тип смены:</label>
                  <select
                    name="shiftType"
                    defaultValue={selectedShiftModal.shift?.shiftType || 'DAY'}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                  >
                    <option value="DAY">☀️ Дневная (09-21)</option>
                    <option value="NIGHT">🌙 Ночная (21-09)</option>
                    <option value="CUSTOM">⚙️ Усиление/Кастом</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Статус:</label>
                  <select
                    name="status"
                    defaultValue={selectedShiftModal.shift?.status || 'PLANNED'}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                  >
                    <option value="PLANNED">Запланировано</option>
                    <option value="COMPLETED">Отработано</option>
                    <option value="VACATION">🌴 Отпуск</option>
                    <option value="SICK">🩹 Больничный</option>
                    <option value="DAY_OFF">Отгул</option>
                  </select>
                </div>
              </div>

              {['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole) && (
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Ставка за смену (₽):</label>
                  <input
                    type="number"
                    name="rate"
                    defaultValue={selectedShiftModal.shift?.rateRubles || 2500}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-muted-foreground mb-1">Примечание / Комментарий:</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={selectedShiftModal.shift?.notes || ''}
                  placeholder="Например: Замена на первую половину дня"
                  className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {selectedShiftModal.shift && (
                  <button
                    type="button"
                    onClick={() => handleDeleteShift(selectedShiftModal.shift!.id)}
                    className="h-8 px-3 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить смену</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedShiftModal(null)}
                    className="h-8 px-3 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground font-bold cursor-pointer"
                  >
                    Отмена
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer shadow-2xs"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Shift Swap Modal (Передача смены коллеге / Взаимный обмен) ── */}
      {isSwapModalOpen && swapShift && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                <span>Передача смены / Взаимный обмен</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl text-xs space-y-1 font-medium">
              <div>Дата вашей смены: <span className="font-bold font-mono text-primary">{swapShift.dateStr}</span> ({swapShift.shiftType === 'DAY' ? '☀️ Дневная (09:00–21:00)' : '🌙 Ночная (21:00–09:00)'})</div>
              <div>Текущий дежурный: <span className="font-bold">{swapShift.userEmail}</span></div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setIsReciprocalSwap(false)}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                  !isReciprocalSwap 
                    ? 'bg-card text-foreground shadow-2xs border border-border/80' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1-Way: Передать дежурство
              </button>
              <button
                type="button"
                onClick={() => setIsReciprocalSwap(true)}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                  isReciprocalSwap 
                    ? 'bg-card text-foreground shadow-2xs border border-border/80 text-blue-600 dark:text-blue-400' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2-Way: Взаимный обмен
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted-foreground mb-1">
                  Коллега для подмены:
                  {isCandidatesLoading && <span className="ml-2 font-normal text-muted-foreground animate-pulse">Проверка занятости...</span>}
                </label>
                <select
                  value={substituteUserId}
                  onChange={(e) => {
                    setSubstituteUserId(e.target.value);
                    setReciprocalShiftId('');
                  }}
                  className="w-full h-9 px-2 bg-background border border-border/60 rounded-xl text-foreground font-medium"
                >
                  <option value="">-- Выберите коллегу из команды --</option>
                  {substituteCandidates.length > 0
                    ? substituteCandidates.map((c) => (
                        <option 
                          key={c.id} 
                          value={c.id}
                          disabled={!c.isAvailable && c.statusBadge !== 'BUSY_OTHER_SLOT'}
                        >
                          {c.email} — {c.statusText}
                        </option>
                      ))
                    : staffList.filter(s => s.id !== swapShift.userId).map(s => (
                        <option key={s.id} value={s.id}>{s.email} ({s.role})</option>
                      ))}
                </select>
              </div>

              {/* Reciprocal Shift Selector (for 2-way swaps) */}
              {isReciprocalSwap && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
                  <label className="block font-bold text-blue-600 dark:text-blue-400">
                    Встречная смена коллеги (которую отработаете вы):
                  </label>
                  {(() => {
                    const selectedCandidate = substituteCandidates.find(c => c.id === substituteUserId);
                    const shifts = selectedCandidate?.availableReciprocalShifts || [];

                    if (!substituteUserId) {
                      return <div className="text-muted-foreground italic text-[11px]">Сначала выберите коллегу выше</div>;
                    }

                    if (shifts.length === 0) {
                      return (
                        <div className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                          ⚠️ У коллеги нет других запланированных смен в этом месяце для встречного обмена. Используйте одностороннюю передачу дежурства.
                        </div>
                      );
                    }

                    return (
                      <select
                        value={reciprocalShiftId}
                        onChange={(e) => setReciprocalShiftId(e.target.value)}
                        className="w-full h-8 px-2 bg-background border border-blue-500/30 rounded-xl text-foreground font-mono font-medium"
                      >
                        <option value="">-- Выберите смену коллеги для отработки --</option>
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.dateStr} — {s.shiftType === 'DAY' ? '☀️ Дневная смена' : '🌙 Ночная смена'}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              {!isReciprocalSwap && (
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Объем подмены:</label>
                  <select
                    value={swapHours}
                    onChange={(e) => setSwapHours(Number(e.target.value))}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-mono"
                  >
                    <option value={0}>Полная смена (12 часов)</option>
                    <option value={4}>Частично: 4 часа</option>
                    <option value={6}>Частично: 6 часов (половина смены)</option>
                    <option value={8}>Частично: 8 часов</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-muted-foreground mb-1">Причина / Договоренность:</label>
                <textarea
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  placeholder="Например: Договорились в Telegram, я выхожу за него в пятницу"
                  rows={2}
                  className="w-full p-2 bg-background border border-border/60 rounded-xl text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="h-8 px-3 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSwap}
                  disabled={isPending || (isReciprocalSwap && !reciprocalShiftId)}
                  className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer shadow-2xs"
                >
                  {isReciprocalSwap ? 'Зафиксировать взаимный обмен' : 'Подтвердить передачу смены'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Time Off Modal (Отпуск / Больничный) ── */}
      {isTimeOffModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-emerald-500" />
                <span>Оформление отпуска / больничного</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTimeOffModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted-foreground mb-1">Сотрудник:</label>
                <select
                  value={timeOffUserId}
                  onChange={(e) => setTimeOffUserId(e.target.value)}
                  disabled={!['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole)}
                  className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.email} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground mb-1">Тип отсутствия:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimeOffType('VACATION')}
                    className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      timeOffType === 'VACATION'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-background text-muted-foreground border-border/60 hover:bg-muted'
                    }`}
                  >
                    🌴 Отпуск
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeOffType('SICK')}
                    className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      timeOffType === 'SICK'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                        : 'bg-background text-muted-foreground border-border/60 hover:bg-muted'
                    }`}
                  >
                    🩹 Больничный
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeOffType('DAY_OFF')}
                    className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      timeOffType === 'DAY_OFF'
                        ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40'
                        : 'bg-background text-muted-foreground border-border/60 hover:bg-muted'
                    }`}
                  >
                    ☕ Отгул
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Дата начала:</label>
                  <input
                    type="date"
                    value={timeOffDateFrom}
                    onChange={(e) => setTimeOffDateFrom(e.target.value)}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Дата окончания:</label>
                  <input
                    type="date"
                    value={timeOffDateTo}
                    onChange={(e) => setTimeOffDateTo(e.target.value)}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground mb-1">Причина / Комментарий:</label>
                <input
                  type="text"
                  value={timeOffNotes}
                  onChange={(e) => setTimeOffNotes(e.target.value)}
                  placeholder="Например: Ежегодный оплачиваемый отпуск"
                  className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTimeOffModalOpen(false)}
                  className="h-8 px-3 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleTimeOffSubmit}
                  disabled={isPending}
                  className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer shadow-2xs"
                >
                  Оформить заявку
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Auto-fill Template Modal (2/2, 5/2) ── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span>Авто-шаблон графика ({MONTH_NAMES[currentMonth - 1]} {currentYear})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted-foreground mb-1">Сотрудник:</label>
                <select
                  value={templateUserId}
                  onChange={(e) => setTemplateUserId(e.target.value)}
                  className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.email} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground mb-1">Паттерн расписания:</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as any)}
                  className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-semibold"
                >
                  <option value="2_2_DAY">График 2/2 (Дневные смены 09:00–21:00)</option>
                  <option value="2_2_NIGHT">График 2/2 (Ночные смены 21:00–09:00)</option>
                  <option value="5_2">График 5/2 (Пн–Пт с выходными Сб–Вс)</option>
                  <option value="DAILY">Ежедневно (Все дни месяца)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">День старта смены:</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={templateStartDay}
                    onChange={(e) => setTemplateStartDay(Number(e.target.value))}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted-foreground mb-1">Ставка за смену (₽):</label>
                  <input
                    type="number"
                    value={templateRate}
                    onChange={(e) => setTemplateRate(Number(e.target.value))}
                    className="w-full h-8 px-2 bg-background border border-border/60 rounded-xl text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="h-8 px-3 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleApplyTemplate}
                  disabled={isPending}
                  className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer shadow-2xs"
                >
                  Применить график
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
