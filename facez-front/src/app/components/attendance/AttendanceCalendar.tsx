"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarPlus, LogIn, LogOut } from 'lucide-react';
import { getMyWorkDays } from '@/app/services/WorkDayService';
import { getMyBalances } from '@/app/services/LeaveService';
import { getByYear as getHolidaysByYear } from '@/app/services/PublicHolidayService';
import { LeaveFormModal } from '@/app/components/leave/LeaveFormModal';
import { AttendanceAdjustmentModal } from './AttendanceAdjustmentModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { WorkDay } from '@/app/commons/types';

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const todayStr = new Date().toISOString().slice(0, 10);

function ymd(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

interface CellStatus { label: string; cls: string; }

function statusOf(date: string, wd: WorkDay | undefined, isHoliday: boolean, isWeekend: boolean): CellStatus {
    if (wd) {
        switch (wd.type) {
            case 'LEAVE': return { label: 'Xin nghỉ', cls: 'bg-green-100 text-green-700' };
            case 'HOLIDAY': return { label: 'Nghỉ lễ', cls: 'bg-orange-100 text-orange-700' };
            case 'HOLIDAY_WORK': return { label: 'Làm ngày nghỉ', cls: 'bg-blue-100 text-blue-700' };
            case 'ABSENT':
                return date > todayStr
                    ? { label: 'Chưa chấm công', cls: 'bg-amber-100 text-amber-700' }
                    : { label: 'Vắng', cls: 'bg-red-100 text-red-700' };
            case 'PRESENT':
            default:
                if (!wd.checkOut) return { label: 'Chưa ra', cls: 'bg-amber-100 text-amber-700' };
                if (wd.violation) return { label: 'Đi muộn', cls: 'bg-amber-100 text-amber-700' };
                if ((wd.workingHour ?? 0) >= 8) return { label: 'Đủ công', cls: 'bg-green-100 text-green-700' };
                return { label: 'Thiếu giờ', cls: 'bg-amber-100 text-amber-700' };
        }
    }
    if (isHoliday) return { label: 'Nghỉ lễ', cls: 'bg-orange-100 text-orange-700' };
    if (isWeekend) return { label: 'Cuối tuần', cls: 'bg-gray-100 text-gray-500' };
    return date > todayStr
        ? { label: '', cls: '' }
        : { label: 'Chưa chấm công', cls: 'bg-amber-100 text-amber-700' };
}

export function AttendanceCalendar() {
    const { showToast } = useToast();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
    const [workdays, setWorkdays] = useState<WorkDay[]>([]);
    const [holidays, setHolidays] = useState<Set<string>>(new Set());
    const [remainingLeave, setRemainingLeave] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [showLeave, setShowLeave] = useState(false);
    const [adjDate, setAdjDate] = useState<string | null>(null);
    const [showAdj, setShowAdj] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [wdRes, holRes] = await Promise.all([
                getMyWorkDays(year, month),
                getHolidaysByYear(year),
            ]);
            setWorkdays(Array.isArray(wdRes.data) ? wdRes.data : []);
            const hols = Array.isArray(holRes.data) ? holRes.data : [];
            setHolidays(new Set(hols.map(h => h.holidayDate)));
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được dữ liệu chấm công', 'error');
        } finally {
            setLoading(false);
        }
        try {
            const balRes = await getMyBalances();
            const bal = (Array.isArray(balRes.data) ? balRes.data : [])
                .find(b => b.leaveType === 'ANNUAL' && b.leaveYear === year);
            setRemainingLeave(bal ? bal.remainingDays : null);
        } catch { /* ignore */ }
    }, [year, month, showToast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const byDate = useMemo(() => {
        const m = new Map<string, WorkDay>();
        workdays.forEach(w => m.set(w.workDate, w));
        return m;
    }, [workdays]);

    // Summary
    const summary = useMemo(() => {
        let hours = 0, days = 0, standard = 0, holidayCount = 0;
        const last = new Date(year, month, 0).getDate();
        for (let d = 1; d <= last; d++) {
            const date = ymd(new Date(year, month - 1, d));
            const dow = new Date(year, month - 1, d).getDay(); // 0 Sun..6 Sat
            const isHol = holidays.has(date);
            if (isHol) holidayCount++;
            if (dow !== 0 && dow !== 6 && !isHol) standard++;
        }
        workdays.forEach(w => { hours += w.workingHour ?? 0; days += w.paidDay ?? 0; });
        return { hours, days, standard, holidayCount };
    }, [workdays, holidays, year, month]);

    // Build the month grid (Monday-first)
    const cells = useMemo(() => {
        const first = new Date(year, month - 1, 1);
        const lead = (first.getDay() + 6) % 7; // Mon=0
        const last = new Date(year, month, 0).getDate();
        const arr: ({ day: number; date: string } | null)[] = [];
        for (let i = 0; i < lead; i++) arr.push(null);
        for (let d = 1; d <= last; d++) arr.push({ day: d, date: ymd(new Date(year, month - 1, d)) });
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [year, month]);

    const prevMonth = () => { const m = month - 1; if (m < 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m); };
    const nextMonth = () => { const m = month + 1; if (m > 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m); };
    const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); };

    const openAdjFor = (date: string) => { setAdjDate(date); setShowAdj(true); };

    return (
        <div className="p-6">
            {/* Summary cards */}
            <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Số phép còn lại" value={remainingLeave != null ? `${remainingLeave} phép` : '—'} />
                <SummaryCard label="Giờ công / Ngày công" value={`${summary.hours.toFixed(1)} giờ / ${summary.days.toFixed(1)} ngày`} />
                <SummaryCard label={`Công chuẩn tháng ${month}`} value={`${summary.standard} công`} />
                <SummaryCard label={`Số ngày nghỉ lễ tháng ${month}`} value={`${summary.holidayCount} ngày`} />
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-lg font-semibold text-gray-800 w-40 text-center">Tháng {String(month).padStart(2, '0')} năm {year}</span>
                    <button onClick={nextMonth} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={goToday} className="ml-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Hôm nay</button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => openAdjFor(todayStr)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-900">
                        <CalendarPlus className="w-4 h-4" /> Bổ sung chấm công
                    </button>
                    <button onClick={() => setShowLeave(true)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Plus className="w-4 h-4" /> Tạo đơn xin nghỉ
                    </button>
                </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEKDAYS.map(w => <div key={w} className="text-center text-sm font-medium text-gray-500">{w}</div>)}
            </div>

            {/* Calendar grid */}
            {loading ? (
                <div className="p-10 text-center text-gray-500">Đang tải…</div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {cells.map((c, i) => {
                        if (!c) return <div key={i} className="bg-gray-50 rounded-lg min-h-[110px]" />;
                        const wd = byDate.get(c.date);
                        const dow = new Date(c.date + 'T00:00:00').getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        const isHoliday = holidays.has(c.date);
                        const st = statusOf(c.date, wd, isHoliday, isWeekend);
                        const hours = wd && (wd.type === 'PRESENT' || wd.type === 'HOLIDAY_WORK')
                            ? `${(wd.workingHour ?? 0).toFixed(1)}h` : (wd?.type === 'ABSENT' ? '0h' : '');
                        const isToday = c.date === todayStr;
                        const canAdjust = !isHoliday && !isWeekend && (!wd || wd.type === 'ABSENT' || (wd.type === 'PRESENT' && (!wd.checkOut || wd.violation)));
                        return (
                            <button key={i} onClick={() => canAdjust && openAdjFor(c.date)}
                                disabled={!canAdjust}
                                className={`text-left bg-white border rounded-lg min-h-[110px] p-2 flex flex-col gap-1
                                    ${isToday ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}
                                    ${canAdjust ? 'hover:bg-blue-50/40 cursor-pointer' : 'cursor-default'}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{c.day}</span>
                                    {hours && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{hours}</span>}
                                </div>
                                {wd && (wd.checkIn || wd.checkOut) && (
                                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                        {wd.checkIn && <span className="inline-flex items-center gap-0.5"><LogIn className="w-3 h-3" />{hhmm(wd.checkIn)}</span>}
                                        {wd.checkOut && <span className="inline-flex items-center gap-0.5"><LogOut className="w-3 h-3" />{hhmm(wd.checkOut)}</span>}
                                    </div>
                                )}
                                {st.label && (
                                    <span className={`mt-auto inline-block text-center text-xs font-medium px-2 py-1 rounded-md ${st.cls}`}>
                                        {st.label}{wd?.type === 'LEAVE' && wd.leaveType ? ` (${wd.leaveType})` : ''}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <LeaveFormModal isOpen={showLeave} onClose={() => setShowLeave(false)} onSuccess={fetchAll} />
            <AttendanceAdjustmentModal isOpen={showAdj} defaultDate={adjDate ?? undefined}
                onClose={() => setShowAdj(false)} onSuccess={fetchAll} />
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-base font-semibold text-gray-800">{value}</div>
        </div>
    );
}
