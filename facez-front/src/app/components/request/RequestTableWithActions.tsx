import React from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
interface AbsenceRecord {
    id: number
    studentName: string
    course: string
    semester: string
    absenceReason: string
    absenceFor: string
}
export function RequestTableWithActions() {
    const absenceRecords: AbsenceRecord[] = [
        {
            id: 1,
            studentName: 'Maria',
            course: 'BICT',
            semester: 'First',
            absenceReason: 'Sick',
            absenceFor: '1 day',
        },
        {
            id: 1,
            studentName: 'Maria',
            course: 'BICT',
            semester: 'First',
            absenceReason: 'Sick',
            absenceFor: '1 day',
        },
    ]
    const handleApprove = (id: number) => {
        console.log('Approve absence:', id)
    }
    const handleReject = (id: number) => {
        console.log('Reject absence:', id)
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Semester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absence reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absence for
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                    </th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {absenceRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.course}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.semester}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.absenceReason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.absenceFor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleApprove(record.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleReject(record.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
