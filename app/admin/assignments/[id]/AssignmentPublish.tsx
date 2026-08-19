'use client'

import { useState } from 'react'
import { publishAssignmentToAll, publishAssignmentToUser } from '@/lib/actions/assignment-publish'

export default function AssignmentPublish({ assignmentId, users }: { assignmentId: string, users: { id: string, full_name: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')

  const handlePublishAll = async () => {
    if (!confirm('Are you sure you want to assign this to all active salesmen?')) return
    setLoading(true)
    const res = await publishAssignmentToAll(assignmentId)
    setLoading(false)
    if (res.error) alert(res.error)
    else alert('Assigned successfully!')
  }

  const handlePublishUser = async () => {
    if (!selectedUser) return
    setLoading(true)
    const res = await publishAssignmentToUser(assignmentId, selectedUser)
    setLoading(false)
    if (res.error) alert(res.error)
    else {
      alert('Assigned successfully!')
      setSelectedUser('')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Publish Assignment</h2>
      <div className="flex flex-col gap-4">
        <div>
          <button 
            onClick={handlePublishAll}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Assign to All Active Salesmen
          </button>
        </div>
        <div className="border-t border-gray-100 my-2" />
        <div className="flex items-center gap-2">
          <select 
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={loading}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select a specific salesman</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
          <button 
            onClick={handlePublishUser}
            disabled={loading || !selectedUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}
