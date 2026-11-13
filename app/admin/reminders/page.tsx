import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Video, AlertTriangle, BellRing } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReminderButton } from '@/components/admin/ReminderButton'
import { SendDueRemindersButton } from '@/components/admin/SendDueRemindersButton'
import {
  fetchReminderTargets,
  fetchOverdueAssignments,
  type ReminderTarget,
  type OverdueAssignmentRow,
} from '@/lib/actions/reminders'

export const dynamic = 'force-dynamic'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ReminderTable({ rows, itemLabel }: { rows: ReminderTarget[]; itemLabel: string }) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-5 md:p-8">
        <EmptyState
          icon={BellRing}
          title="Nothing to remind"
          description={`No ${itemLabel} need a nudge right now.`}
        />
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Intern</th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{itemLabel}</th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due / Scheduled</th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Remind</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={`${row.kind}-${row.item_id}-${row.user_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 text-sm">
                {row.full_name ?? '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{row.item_title}</td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatWhen(row.due_at)}</td>
              <td className="px-6 py-4">
                <ReminderButton phone={row.whatsapp} message={row.message} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OverdueSection({ rows }: { rows: OverdueAssignmentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-5 md:p-8">
        <EmptyState
          icon={AlertTriangle}
          title="Nothing overdue"
          description="Every past-due assignment has been submitted by all assigned interns."
        />
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Was due</th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue interns</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={row.assignment_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4">
                <Link href={`/admin/assignments/${row.assignment_id}`} className="font-medium text-gray-900 dark:text-gray-100 block hover:text-brand-600 text-sm">
                  {row.title}
                </Link>
              </td>
              <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 font-medium">
                {formatWhen(row.due_date)}
              </td>
              <td className="px-6 py-4">
                <ul className="space-y-2">
                  {row.overdue_users.map((u) => (
                    <li key={u.user_id} className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{u.full_name ?? '—'}</span>
                      <ReminderButton phone={u.whatsapp} message={u.message} />
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function RemindersAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [targets, overdue] = await Promise.all([
    fetchReminderTargets(),
    fetchOverdueAssignments(),
  ])

  return (
    <div className="px-4 py-5 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reminders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Nudge interns on WhatsApp about due assignments and upcoming meetings, and send bell reminders before deadlines.
          </p>
        </div>
        <SendDueRemindersButton />
      </div>

      {targets.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
          Could not load reminder targets: {targets.error}
        </p>
      )}
      {overdue.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
          Could not load overdue assignments: {overdue.error}
        </p>
      )}

      <Section
        title="Due assignments"
        description="Assignments due within the next 7 days — interns who have not submitted yet. Tap to open a pre-filled WhatsApp message."
        icon={<ClipboardList className="w-5 h-5 text-brand-600" />}
      >
        <ReminderTable rows={targets.data?.dueAssignments ?? []} itemLabel="Assignment" />
      </Section>

      <Section
        title="Upcoming meetings"
        description="Meetings scheduled in the next 48 hours, with their invitees. Tap to open a pre-filled WhatsApp message."
        icon={<Video className="w-5 h-5 text-brand-600" />}
      >
        <ReminderTable rows={targets.data?.upcomingMeetings ?? []} itemLabel="Meeting" />
      </Section>

      <Section
        title="Overdue"
        description="Assignments past their due date, with the interns who still have not submitted."
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
      >
        <OverdueSection rows={overdue.data ?? []} />
      </Section>
    </div>
  )
}
