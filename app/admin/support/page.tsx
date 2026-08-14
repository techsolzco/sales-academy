import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Clock, Eye, Search } from 'lucide-react'
import { fetchAllTickets } from '@/lib/actions/tickets'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Support Tickets | Admin Portal',
}

const statusColors = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700'
}

export default async function AdminSupportPage({
  searchParams
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const currentStatus = searchParams.status || 'all'
  const allTickets = await fetchAllTickets()
  
  const tickets = currentStatus === 'all' 
    ? allTickets 
    : allTickets.filter(t => t.status === currentStatus)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets Management</h1>
        <p className="text-gray-500 mt-1 text-sm">Review and respond to all user support requests.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {['all', 'open', 'in-progress', 'resolved', 'closed'].map(status => (
          <Link
            key={status}
            href={`/admin/support${status !== 'all' ? `?status=${status}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              currentStatus === status 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
              {status === 'all' ? allTickets.length : allTickets.filter(t => t.status === status).length}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 max-w-xs truncate" title={ticket.subject}>
                      {ticket.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {ticket.profile?.full_name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{ticket.profile?.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                      {ticket.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="w-4 h-4" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/support/${ticket.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-brand-600 hover:bg-brand-50 font-medium text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No tickets found for this status.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
