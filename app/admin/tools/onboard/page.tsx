import { Breadcrumb } from '@/components/admin/Breadcrumb'
import { ToolOnboardWizard } from '@/components/admin/ToolOnboardWizard'

export default function ToolOnboardPage() {
  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Tools', href: '/admin/tools' },
        { label: 'Onboard New Tool' },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🌳 New Tool Onboarding Wizard</h1>
        <p className="text-sm text-gray-400 mt-1">
          Describe a tool and AI will generate a complete training package — course, FAQs, objections, and scripts — all linked together.
        </p>
      </div>

      <ToolOnboardWizard />
    </div>
  )
}
