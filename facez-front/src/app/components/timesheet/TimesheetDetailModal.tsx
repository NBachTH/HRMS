"use client";

import React from 'react';
import { Modal } from '@/app/components/common/Modal';
import type { Timesheet } from '@/app/commons/types';

interface Props {
    timesheet: Timesheet | null;
    onClose: () => void;
}

const n = (v?: number) => (v == null ? '0' : (Number.isInteger(v) ? String(v) : v.toFixed(2)));

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
    return (
        <tr className={strong ? 'bg-blue-50/40' : ''}>
            <td className="px-4 py-2 text-sm text-gray-700 border border-gray-200">{label}</td>
            <td className={`px-4 py-2 text-sm text-right border border-gray-200 ${strong ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{value}</td>
        </tr>
    );
}

function SectionRow({ label }: { label: string }) {
    return (
        <tr><td colSpan={2} className="px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-100 border border-gray-200">{label}</td></tr>
    );
}

export function TimesheetDetailModal({ timesheet: t, onClose }: Props) {
    if (!t) return null;

    return (
        <Modal isOpen={!!t} onClose={onClose}
            title={`Timesheet · ${String(t.month).padStart(2, '0')}/${t.year}`} width="max-w-3xl">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <tbody>
                        <Row label="Họ và tên" value={<span className="font-medium">{t.employeeName || t.employeeId}</span>} />
                        <Row label="Mã NV" value={t.employeeId} />
                        <Row label="Đơn vị" value={t.departmentId ?? '—'} />
                        <Row label="Ngày công chuẩn" value={t.standardWorkingDays} strong />
                        <Row label="Tổng ngày công thực tế" value={n(t.actualWorkingDays)} />
                        <Row label="Tổng giờ OT" value={n(t.otHours)} />
                        <Row label="Nghỉ lễ / Bù nghỉ lễ" value={n(t.holidayLeaveDays)} />
                        <Row label="Nghỉ phép" value={n(t.annualLeaveDays)} />
                        <Row label="Nghỉ bù" value={n(t.compLeaveDays)} />
                        <Row label="Nghỉ hiếu / hỉ" value={n(t.bereavementMarriageDays)} />
                        <Row label="Nghỉ hưởng chế độ bảo hiểm" value={n(t.insuranceLeaveDays)} />
                        <Row label="Nghỉ không hưởng lương" value={n(t.unpaidLeaveDays)} />
                        <Row label="Ngày công hưởng lương cũ" value={n(t.oldRatePaidDays)} />
                        <Row label="Ngày công hưởng lương mới" value={n(t.newRatePaidDays)} />
                        <Row label="Tổng công hưởng lương tháng" value={n(t.totalPaidDays)} strong />
                        <Row label="Bù ngày công tháng trước" value={n(t.carryOverPrevMonth)} />
                        <Row label="Business go out" value={n(t.businessGoOutDays)} />
                        <Row label="WFH" value={n(t.wfhDays)} />
                        <Row label="Nghỉ không lí do" value={n(t.unexplainedAbsenceDays)} />

                        <SectionRow label="Thông tin vi phạm" />
                        <Row label="Tổng thời gian đi muộn/về sớm (giờ)" value={n(t.lateEarlyTotalHours)} />
                        <Row label="Tổng ngày vi phạm quy đổi ra nghỉ bù" value={n(t.violationToComp)} />
                        <Row label="Tổng ngày vi phạm quy đổi ra nghỉ phép" value={n(t.violationToLeave)} />
                        <Row label="Tổng ngày vi phạm quy đổi ra nghỉ không lương" value={n(t.violationToUnpaid)} />

                        <SectionRow label="Tổng vi phạm" />
                        <Row label="Nghỉ làm không thông báo" value={t.unnotifiedAbsenceCount} />
                        <Row label="Số lần vi phạm thời gian làm việc không đủ 8h" value={t.under8hCount} />
                        <Row label="Lỗi log Attendance Request quá 4 lần" value={t.attendanceRequestErrors} />
                        <Row label="Trừ lương KPI2" value={t.kpi2Deduction?.toLocaleString('vi-VN')} />
                        <Row label="Chỉ số KPI2" value={n(t.kpi2Index)} strong />
                        <Row label="Bù/trừ vi phạm chấm công tháng trước" value={n(t.prevMonthViolationAdjust)} />
                        {t.notes && <Row label="Ghi chú" value={t.notes} />}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-4">
                <button onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                    Close
                </button>
            </div>
        </Modal>
    );
}
