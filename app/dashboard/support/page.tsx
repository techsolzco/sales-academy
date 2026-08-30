import { createClient } from '@/lib/supabase/server'
import { SITE_NAME } from '@/lib/config/site'
import Link from 'next/link'
import { PlusCircle, Clock, Search } from 'lucide-react'
import { fetchMyTickets } from '@/lib/actions/tickets'

export const metadata = {
  title: `Support | ${SITE_NAME}`,
}

const statusColors = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700'
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tickets = await fetchMyTickets()

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your support requests and track their status.</p>
        </div>
        <Link 
          href="/dashboard/support/new" 
          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition flex items-center gap-2 shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Open New Ticket
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {tickets.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <Link 
                key={ticket.id} 
                href={`/dashboard/support/${ticket.id}`}
                className="block p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">{ticket.category}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{ticket.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-brand-600 text-sm font-medium">
                    View Thread →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No tickets yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              You haven't submitted any support tickets. If you need help, feel free to open a new one.
            </p>
            <Link 
              href="/dashboard/support/new" 
              className="inline-flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700"
            >
              <PlusCircle className="w-5 h-5" />
              Open New Ticket
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
