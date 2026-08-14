import { createClient } from '@/lib/supabase/server'
import { fetchTicket } from '@/lib/actions/tickets'
import { TicketThread } from '@/components/tickets/TicketThread'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Ticket Details | Sales Academy',
}

export default async function TicketDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const ticket = await fetchTicket(params.id)
  
  // Basic guard (RLS should handle real security)
  if (!ticket || ticket.user_id !== user.id) {
    redirect('/dashboard/support')
  }


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard/support" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>
      </div>
      
      <TicketThread 
        ticket={ticket} 
        initialMessages={ticket.messages ?? []} 
        currentUserId={user.id} 
        currentUserRole="salesman" 
      />
    </div>
  )
}
