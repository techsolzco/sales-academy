import { TicketForm } from '@/components/tickets/TicketForm'
import { SITE_NAME } from '@/lib/config/site'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export const metadata = {
  title: `New Support Ticket | ${SITE_NAME}`,
}

export default function NewTicketPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
        <Link href="/dashboard" className="hover:text-brand-600 flex items-center gap-1">
          <Home className="w-4 h-4" />
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/support" className="hover:text-brand-600 font-medium">
          Support
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">New Ticket</span>
      </nav>

      <TicketForm />
    </div>
  )
}
