import { getAiTrainingSettings } from '@/lib/actions/ai-assist'
import { AiTrainingForm } from './AiTrainingForm'
import { Breadcrumb } from '@/components/admin/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function AiTrainingPage() {
  const settings = await getAiTrainingSettings()
  return (
    <div className="p-6 md:p-8 max-w-4xl animate-fade-in">
      <Breadcrumb crumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Settings', href: '/admin/settings' },
        { label: 'AI Training' },
      ]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Training Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure the AI persona, locked facts, and tone. All AI features (AI Assist, Quick Create, Ask AI) use these settings in real-time.
        </p>
      </div>
      <AiTrainingForm initialSettings={settings} />
    </div>
  )
}
