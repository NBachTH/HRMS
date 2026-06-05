import React from 'react'
interface AbsenceRecord {
    id: number
    studentName: string
    course: string
    semester: string
    absenceReason: string
    absenceFor: string
}
export function RequestTableSimple() {
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
            semester: 'Second',
            absenceReason: '2',
            absenceFor: '1 day',
        },
    ]
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
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
