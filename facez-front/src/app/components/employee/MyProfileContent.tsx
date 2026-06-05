"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    UserIcon, MailIcon, PhoneIcon, MapPinIcon, CalendarIcon,
    LockIcon, CreditCardIcon, ShieldIcon, Edit2Icon, UploadIcon, FileTextIcon,
} from 'lucide-react';
import { getMyProfile, updateEmployee, uploadProfilePicture } from '@/app/services/EmployeeService';
import { getMyBalances } from '@/app/services/LeaveService';
import { getMyContract } from '@/app/services/ContractService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { Employee, LeaveBalance, Contract } from '@/app/commons/types';
import { changePassword } from '@/app/services/AuthService';
import { formatDate, formatVnd } from '@/app/commons/utils/formatters';

const LEAVE_TYPE_LABELS: Record<string, string> = {
    ANNUAL: 'Annual', SICK: 'Sick', MATERNITY: 'Maternity', PATERNITY: 'Paternity',
    BEREAVEMENT: 'Bereavement', MARRIAGE: 'Marriage', UNPAID: 'Unpaid', COMPENSATORY: 'Compensatory',
};

// ── Change Password Modal ──────────────────────────────────────────────────────

function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) { setForm({ oldPassword: '', newPassword: '', confirm: '' }); setErrors({}); }
    }, [isOpen]);

    const set = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.oldPassword) errs.oldPassword = 'Required';
        if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = 'At least 6 characters';
        if (form.newPassword !== form.confirm) errs.confirm = 'Passwords do not match';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await changePassword(form.oldPassword, form.newPassword);
            showToast('Password changed successfully');
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to change password', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Password" width="max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                {(['oldPassword', 'newPassword', 'confirm'] as const).map((field) => (
                    <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field === 'oldPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm Password'}
                            <span className="text-red-500"> *</span>
                        </label>
                        <input
                            type="password"
                            value={form[field]}
                            onChange={e => set(field, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                                ${errors[field] ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
                    </div>
                ))}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Change Password'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────────

function EditProfileModal({ isOpen, onClose, employee, onSuccess }: {
    isOpen: boolean; onClose: () => void; employee: Employee; onSuccess: () => void;
}) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        phoneNumber: '', address: '', emergencyContact: '',
        bankAccountNumber: '', bankName: '', bankBranch: '',
    });

    useEffect(() => {
        if (isOpen && employee) {
            setForm({
                phoneNumber: employee.phoneNumber || '',
                address: employee.address || '',
                emergencyContact: employee.emergencyContact || '',
                bankAccountNumber: employee.bankAccountNumber || '',
                bankName: employee.bankName || '',
                bankBranch: employee.bankBranch || '',
            });
        }
    }, [isOpen, employee]);

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateEmployee(employee.employeeId, {
                phoneNumber: form.phoneNumber || undefined,
                address: form.address || undefined,
                emergencyContact: form.emergencyContact || undefined,
                bankAccountNumber: form.bankAccountNumber || undefined,
                bankName: form.bankName || undefined,
                bankBranch: form.bankBranch || undefined,
            });
            showToast('Profile updated');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'address', label: 'Address' },
        { key: 'emergencyContact', label: 'Emergency Contact' },
        { key: 'bankAccountNumber', label: 'Bank Account Number' },
        { key: 'bankName', label: 'Bank Name' },
        { key: 'bankBranch', label: 'Bank Branch' },
    ] as const;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" width="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {fields.map(({ key, label }) => (
                        <div key={key} className={key === 'address' || key === 'emergencyContact' ? 'col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                            <input
                                type="text"
                                value={form[key]}
                                onChange={e => set(key, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Leave Balance Cards ────────────────────────────────────────────────────────

function LeaveBalanceCards({ employeeId }: { employeeId: string }) {
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyBalances()
            .then(res => { if (res.success && res.data) setBalances(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [employeeId]);

    if (loading) return <div className="text-sm text-gray-400 py-4">Loading balances…</div>;
    if (!balances.length) return <div className="text-sm text-gray-400 py-4">No leave balance data available.</div>;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {balances.map(b => {
                const pct = b.entitlementDays > 0 ? (b.remainingDays / b.entitlementDays) * 100 : 0;
                const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                    <div key={b.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            {LEAVE_TYPE_LABELS[b.leaveType] || b.leaveType}
                        </p>
                        <p className="text-2xl font-bold text-gray-800">{b.remainingDays.toFixed(1)}</p>
                        <p className="text-xs text-gray-400 mb-2">of {b.entitlementDays} days remaining</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>Used: {b.usedDays.toFixed(1)}</span>
                            <span>Pending: {b.pendingDays.toFixed(1)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    return (
        <div className="flex items-start gap-3 py-2">
            <div className="flex-none text-gray-400 mt-0.5">{icon}</div>
            <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm text-gray-800">{value || '—'}</p>
            </div>
        </div>
    );
}

export function MyProfileContent() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [contract, setContract] = useState<Contract | null>(null);
    const [contractLoading, setContractLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await getMyProfile();
            if (res.success && res.data) setEmployee(res.data);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    useEffect(() => {
        getMyContract()
            .then(res => { if (res.success && res.data) setContract(res.data); })
            .catch(() => { })
            .finally(() => setContractLoading(false));
    }, []);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !employee) return;
        setUploading(true);
        try {
            await uploadProfilePicture(employee.employeeId, file);
            showToast('Profile picture updated');
            fetchProfile();
        } catch (err: any) {
            showToast(err?.body?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!employee) {
        return <div className="p-8 text-center text-gray-500">Could not load profile.</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-1">My Profile</h1>
                <p className="text-sm text-gray-500">{employee.employeeId} · {employee.role}</p>
            </div>

            {/* Avatar + quick actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex items-center gap-6">
                <div className="relative flex-none">
                    {employee.profilePictureUrl ? (
                        <img src={employee.profilePictureUrl} alt={employee.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-bold text-white">
                            {employee.name?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm">
                        {uploading
                            ? <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            : <UploadIcon className="w-3.5 h-3.5 text-gray-600" />}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                    </label>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                    <p className="text-sm text-gray-500">{employee.departmentName || '—'}</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button onClick={() => setShowEdit(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                        <Edit2Icon className="w-4 h-4" /> Edit Profile
                    </button>
                    <button onClick={() => setShowPassword(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                        <LockIcon className="w-4 h-4" /> Change Password
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Personal Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-blue-600" /> Personal Information
                    </h3>
                    <InfoRow icon={<MailIcon className="w-4 h-4" />} label="Email" value={employee.email} />
                    <InfoRow icon={<PhoneIcon className="w-4 h-4" />} label="Phone" value={employee.phoneNumber} />
                    <InfoRow icon={<MapPinIcon className="w-4 h-4" />} label="Address" value={employee.address} />
                    <InfoRow icon={<CalendarIcon className="w-4 h-4" />} label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                    <InfoRow icon={<CalendarIcon className="w-4 h-4" />} label="Date of Joining" value={formatDate(employee.dateOfJoining)} />
                    <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Gender" value={employee.gender} />
                    <InfoRow icon={<MapPinIcon className="w-4 h-4" />} label="Hometown" value={employee.hometown} />
                </div>

                {/* Statutory Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <ShieldIcon className="w-4 h-4 text-blue-600" /> Statutory Information
                    </h3>
                    <InfoRow icon={<CreditCardIcon className="w-4 h-4" />} label="National ID" value={employee.nationalId} />
                    <InfoRow icon={<ShieldIcon className="w-4 h-4" />} label="Tax Code" value={employee.taxCode} />
                    <InfoRow icon={<ShieldIcon className="w-4 h-4" />} label="Social Insurance Code" value={employee.socialInsuranceCode} />
                    <InfoRow icon={<CreditCardIcon className="w-4 h-4" />} label="Bank Account" value={employee.bankAccountNumber} />
                    <InfoRow icon={<CreditCardIcon className="w-4 h-4" />} label="Bank Name" value={employee.bankName} />
                    <InfoRow icon={<CreditCardIcon className="w-4 h-4" />} label="Bank Branch" value={employee.bankBranch} />
                </div>
            </div>

            {/* Leave Balances */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" /> Leave Balances ({new Date().getFullYear()})
                </h3>
                <LeaveBalanceCards employeeId={employee.employeeId} />
            </div>

            {/* My Contract */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4 text-blue-600" /> My Contract
                </h3>
                {contractLoading ? (
                    <div className="text-sm text-gray-400 py-4">Loading contract…</div>
                ) : !contract ? (
                    <div className="text-sm text-gray-400 py-4">No active contract found.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Contract Type</p>
                            <p className="text-sm font-medium text-gray-800">{contract.contractType}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Status</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                                ${contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                  contract.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'}`}>
                                {contract.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Start Date</p>
                            <p className="text-sm text-gray-800">{formatDate(contract.startDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">End Date</p>
                            <p className="text-sm text-gray-800">{contract.endDate ? formatDate(contract.endDate) : 'Indefinite'}</p>
                        </div>
                        {contract.baseSalary !== undefined && (
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Base Salary</p>
                                <p className="text-sm font-semibold text-gray-800">{formatVnd(contract.baseSalary)}</p>
                            </div>
                        )}
                        {contract.salaryRank && (
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Salary Rank</p>
                                <p className="text-sm text-gray-800">{contract.salaryRank}</p>
                            </div>
                        )}
                        {contract.notes && (
                            <div className="col-span-2 md:col-span-3">
                                <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                                <p className="text-sm text-gray-600">{contract.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {employee && (
                <>
                    <EditProfileModal
                        isOpen={showEdit}
                        onClose={() => setShowEdit(false)}
                        employee={employee}
                        onSuccess={fetchProfile}
                    />
                    <ChangePasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} />
                </>
            )}
        </div>
    );
}
