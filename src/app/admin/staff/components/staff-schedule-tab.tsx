'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { 
  getMonthShiftsAction, 
  assignShiftAction, 
  swapShiftAction, 
  applyShiftTemplateAction,
  StaffScheduleRow,
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
  Download,
  Clock
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

export function StaffScheduleTab({
  currentUserRole,
}: StaffScheduleTabProps) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1..12
  const [scheduleRows, setScheduleRows] = useState<StaffScheduleRow[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [selectedCell, setSelectedCell] = useState<{
    staff: StaffScheduleRow;
    day: number;
    shift?: ShiftInfo;
  } | null>(null);

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateUserId, setTemplateUserId] = useState<string>('');
  const [templateType, setTemplateType] = useState<'2_2_DAY' | '2_2_NIGHT' | '5_2' | 'DAILY'>('2_2_DAY');
  const [templateStartDay, setTemplateStartDay] = useState(1);
  const [templateRate, setTemplateRate] = useState(2500);

  // Swap Modal
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapShift, setSwapShift] = useState<ShiftInfo | null>(null);
  const [substituteUserId, setSubstituteUserId] = useState<string>('');
  const [swapHours, setSwapHours] = useState<number>(0); // 0 = full shift, >0 = partial hours
  const [swapNotes, setSwapNotes] = useState<string>('');

  // Fetch Month Schedule
  const loadMonthData = async (y: number, m: number) => {
    setIsLoading(true);
    try {
      const res = await getMonthShiftsAction(y, m);
      if (res.success) {
        setScheduleRows(res.rows);
        setDaysInMonth(res.daysInMonth);
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
    rate = 2500
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
        });

        if (res.success) {
          toast.success('Смена обновлена');
          loadMonthData(currentYear, currentMonth);
          setSelectedCell(null);
        } else {
          toast.error(res.error || 'Ошибка назначения');
        }
      } catch {
        toast.error('Сбой при сохранении');
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

  // Execute Swap
  const handleExecuteSwap = () => {
    if (!swapShift || !substituteUserId || !swapNotes) {
      toast.error('Заполните все поля подмены');
      return;
    }

    startTransition(async () => {
      try {
        const res = await swapShiftAction({
          shiftId: swapShift.id,
          substituteUserId,
          substituteHours: swapHours,
          notes: swapNotes,
        });

        if (res.success) {
          toast.success('Подмена успешно зафиксирована');
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

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* ── TOP CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs sm:text-sm text-foreground px-3 min-w-[130px] text-center">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground hidden md:inline">
            Кликните на ячейку для назначения смены или фиксации отпуска/подмены
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (scheduleRows.length > 0) {
                setTemplateUserId(scheduleRows[0].userId);
              }
              setIsTemplateModalOpen(true);
            }}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Заполнить по шаблону (2/2, 5/2)
          </button>
        </div>
      </div>

      {/* ── SCHEDULE MATRIX ── */}
      <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Загрузка сетки смен...</span>
          </div>
        ) : scheduleRows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            Сотрудники не найдены
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase">
                  <th className="sticky left-0 z-20 bg-card/95 backdrop-blur-md px-3 py-3 text-left min-w-[160px] border-r border-border/60">
                    Сотрудник
                  </th>
                  {daysArray.map((day) => {
                    const dateObj = new Date(currentYear, currentMonth - 1, day);
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    return (
                      <th
                        key={day}
                        className={`p-1.5 min-w-[34px] border-r border-border/40 font-mono ${
                          isWeekend ? 'bg-muted/40 text-amber-500 font-bold' : ''
                        }`}
                      >
                        <div>{day}</div>
                        <div className="text-[8px] font-normal text-muted-foreground">
                          {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dayOfWeek]}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-right min-w-[80px]">План / Факт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {scheduleRows.map((staff) => (
                  <tr key={staff.userId} className="hover:bg-muted/20 transition-colors">
                    {/* Fixed staff name column */}
                    <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-md px-3 py-2.5 text-left border-r border-border/60">
                      <div className="font-bold text-foreground text-xs truncate max-w-[140px]" title={staff.userEmail}>
                        {staff.userEmail.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{staff.role}</div>
                    </td>

                    {/* 1..31 Days Cells */}
                    {daysArray.map((day) => {
                      const shift = staff.shifts[day];
                      const isPlanned = shift?.status === 'PLANNED';
                      const isSwapped = shift?.status === 'SWAPPED';
                      const isVacation = shift?.status === 'VACATION';
                      const isSick = shift?.status === 'SICK';
                      const isDay = shift?.shiftType === 'DAY';
                      const isNight = shift?.shiftType === 'NIGHT';

                      return (
                        <td
                          key={day}
                          onClick={() => setSelectedCell({ staff, day, shift })}
                          className="p-1 border-r border-border/40 cursor-pointer hover:bg-primary/10 transition-colors relative group/cell"
                        >
                          {shift ? (
                            <div
                              className={`w-full h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs ${
                                isVacation
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : isSick
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : isSwapped
                                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                  : isNight
                                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}
                              title={
                                isVacation
                                  ? '🌴 Отпуск'
                                  : isSick
                                  ? '🏥 Больничный'
                                  : isSwapped
                                  ? shift.substituteHours && shift.substituteHours > 0
                                    ? `🔄 Почасовая подмена на ${shift.substituteHours}ч: вышел ${shift.substituteUserEmail}`
                                    : `🔄 Полная подмена: вышел ${shift.substituteUserEmail}`
                                  : isNight
                                  ? '🌙 Ночь (21:00-09:00)'
                                  : '☀️ День (09:00-21:00)'
                              }
                            >
                              {isVacation ? (
                                <Palmtree className="w-3 h-3" />
                              ) : isSick ? (
                                <HeartPulse className="w-3 h-3" />
                              ) : isSwapped ? (
                                shift.substituteHours && shift.substituteHours > 0 ? (
                                  <span className="text-[9px] font-black">{shift.substituteHours}ч</span>
                                ) : (
                                  <ArrowLeftRight className="w-3 h-3" />
                                )
                              ) : isNight ? (
                                <Moon className="w-3 h-3" />
                              ) : (
                                <Sun className="w-3 h-3" />
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-7 rounded-md border border-dashed border-transparent group-hover/cell:border-border/60 flex items-center justify-center text-muted-foreground/30 group-hover/cell:text-muted-foreground">
                              +
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Summary plan/fact */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                      <span>{staff.plannedShiftsCount}</span>
                      <span className="text-muted-foreground font-normal"> / </span>
                      <span className="text-primary">{staff.actualWorkedCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CELL ACTIONS MODAL ── */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {selectedCell.day} {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </h3>
                <p className="text-xs text-muted-foreground">{selectedCell.staff.userEmail}</p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Назначить статус смены:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleAssignShift(selectedCell.staff.userId, selectedCell.day, 'DAY', 'PLANNED')
                  }
                  className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  <Sun className="w-4 h-4" /> ☀️ День (09-21)
                </button>
                <button
                  onClick={() =>
                    handleAssignShift(selectedCell.staff.userId, selectedCell.day, 'NIGHT', 'PLANNED')
                  }
                  className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-500/20 transition-all cursor-pointer"
                >
                  <Moon className="w-4 h-4" /> 🌙 Ночь (21-09)
                </button>
                <button
                  onClick={() =>
                    handleAssignShift(selectedCell.staff.userId, selectedCell.day, 'DAY', 'VACATION', 0)
                  }
                  className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <Palmtree className="w-4 h-4" /> 🌴 Отпуск
                </button>
                <button
                  onClick={() =>
                    handleAssignShift(selectedCell.staff.userId, selectedCell.day, 'DAY', 'SICK', 0)
                  }
                  className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  <HeartPulse className="w-4 h-4" /> 🏥 Больничный
                </button>
              </div>

              {selectedCell.shift && selectedCell.shift.status === 'PLANNED' && (
                <button
                  onClick={() => {
                    setSwapShift(selectedCell.shift!);
                    const otherStaff = scheduleRows.filter((s) => s.userId !== selectedCell.staff.userId);
                    if (otherStaff.length > 0) {
                      setSubstituteUserId(otherStaff[0].userId);
                    }
                    setIsSwapModalOpen(true);
                    setSelectedCell(null);
                  }}
                  className="w-full mt-2 p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-sky-500/20 transition-all cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" /> Оформить подмену сотрудника
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPLATE MODAL ── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground">
                Автозаполнение графика на {MONTH_NAMES[currentMonth - 1]}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Сотрудник:</label>
                <select
                  value={templateUserId}
                  onChange={(e) => setTemplateUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                >
                  {scheduleRows.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.userEmail} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Шаблон смен:</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as "2_2_DAY" | "2_2_NIGHT" | "5_2" | "DAILY")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                >
                  <option value="2_2_DAY">2 через 2 (Дневные смены 09:00–21:00)</option>
                  <option value="2_2_NIGHT">2 через 2 (Ночные смены 21:00–09:00)</option>
                  <option value="5_2">5 через 2 (Пн–Пт стандартный)</option>
                  <option value="DAILY">Каждый день без выходных</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Первый рабочий день:</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={templateStartDay}
                    onChange={(e) => setTemplateStartDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Ставка за смену (₽):</label>
                  <input
                    type="number"
                    step={100}
                    value={templateRate}
                    onChange={(e) => setTemplateRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-foreground hover:bg-muted"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleApplyTemplate}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                {isPending ? 'Применение...' : 'Применить шаблон'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SWAP MODAL ── */}
      {isSwapModalOpen && swapShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Взаимная договоренность о подмене</h3>
                <p className="text-[11px] text-muted-foreground">Для порядка и прозрачности в графике</p>
              </div>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed bg-primary/5 p-3 rounded-xl border border-primary/15">
              🤝 Вы можете свободно договариваться между собой. Достаточно отметить коллегу, чтобы смена и оплата за этот день автоматически зачислились тому, кто фактически выйдет на работу.
            </p>

            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1">
              <div><strong>Дата смены:</strong> {swapShift.dateStr}</div>
              <div><strong>Плановый сотрудник:</strong> {swapShift.userEmail}</div>
              <div><strong>Ставка за смену (12ч):</strong> {formatRubles(swapShift.rateRubles)} (~{Math.round(swapShift.rateRubles / 12)} ₽/час)</div>
            </div>

            {/* Swap Format Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Формат подмены:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSwapHours(0)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    swapHours === 0
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Вся смена (12ч)
                </button>
                <button
                  type="button"
                  onClick={() => setSwapHours(swapHours > 0 ? swapHours : 3)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    swapHours > 0
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> По часам в сутки
                </button>
              </div>
            </div>

            {swapHours > 0 && (
              <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Сколько часов подменял:</span>
                  <span className="font-mono font-black text-sky-600 dark:text-sky-400 text-sm">
                    {swapHours} {swapHours === 1 ? 'час' : swapHours < 5 ? 'часа' : 'часов'}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={11}
                  step={1}
                  value={swapHours}
                  onChange={(e) => setSwapHours(Number(e.target.value))}
                  className="w-full cursor-pointer accent-sky-500"
                />
                <div className="text-[11px] text-muted-foreground flex justify-between font-mono">
                  <span>1ч</span>
                  <span className="text-sky-600 font-bold">
                    ~{Math.round(swapHours * (swapShift.rateRubles / 12))} ₽ сменщику
                  </span>
                  <span>11ч</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Кто выйдет по договоренности:</label>
                <select
                  value={substituteUserId}
                  onChange={(e) => setSubstituteUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                >
                  {scheduleRows
                    .filter((s) => s.userId !== swapShift.userId)
                    .map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.userEmail} ({s.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Заметка / Причина (для руководства):</label>
                <textarea
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  placeholder="Например: Договорились поменяться сменами / Личные дела..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground h-16"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-foreground hover:bg-muted cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteSwap}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                {isPending ? 'Сохранение...' : 'Зафиксировать договоренность'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
