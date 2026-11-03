'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpen, FileText, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TrainingTabKey = 'courses' | 'scripts' | 'objections' | 'faqs'

interface TrainingTabsProps {
  initialTab?: string
  coursesCount: number
  scriptsCount: number
  objectionsCount: number
  faqsCount: number
  coursesContent: React.ReactNode
  scriptsContent: React.ReactNode
  objectionsContent: React.ReactNode
  faqsContent: React.ReactNode
}

export function TrainingTabs({
  initialTab = 'courses',
  coursesCount,
  scriptsCount,
  objectionsCount,
  faqsCount,
  coursesContent,
  scriptsContent,
  objectionsContent,
  faqsContent,
}: TrainingTabsProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  
  const validTabs: TrainingTabKey[] = ['courses', 'scripts', 'objections', 'faqs']
  const resolveTab = (val?: string | null): TrainingTabKey => {
    if (val && validTabs.includes(val as TrainingTabKey)) {
      return val as TrainingTabKey
    }
    return 'courses'
  }

  const [activeTab, setActiveTab] = useState<TrainingTabKey>(resolveTab(tabParam || initialTab))

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as TrainingTabKey)) {
      setActiveTab(tabParam as TrainingTabKey)
    }
  }, [tabParam])

  function handleTabChange(tab: TrainingTabKey) {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const tabs = [
    { id: 'courses' as const, label: 'Courses', count: coursesCount, icon: BookOpen },
    { id: 'scripts' as const, label: 'Scripts', count: scriptsCount, icon: FileText },
    { id: 'objections' as const, label: 'Objections', count: objectionsCount, icon: AlertCircle },
    { id: 'faqs' as const, label: 'FAQs', count: faqsCount, icon: HelpCircle },
  ]

  return (
    <div>
      {/* Tabs navigation bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6 sm:mb-8">
        <nav
          className="flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-none pb-px"
          aria-label="Training library tabs"
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 py-3 px-3 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors outline-none cursor-pointer',
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500')} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                    isActive
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab panels */}
      <div>
        {activeTab === 'courses' && (
          <div id="tab-panel-courses" role="tabpanel" aria-label="Courses">
            {coursesContent}
          </div>
        )}
        {activeTab === 'scripts' && (
          <div id="tab-panel-scripts" role="tabpanel" aria-label="Scripts">
            {scriptsContent}
          </div>
        )}
        {activeTab === 'objections' && (
          <div id="tab-panel-objections" role="tabpanel" aria-label="Objections">
            {objectionsContent}
          </div>
        )}
        {activeTab === 'faqs' && (
          <div id="tab-panel-faqs" role="tabpanel" aria-label="FAQs">
            {faqsContent}
          </div>
        )}
      </div>
    </div>
  )
}
