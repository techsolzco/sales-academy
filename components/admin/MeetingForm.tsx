'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMeeting } from '@/lib/actions/meetings'
import type { Profile, Course } from '@/types'

interface MeetingFormProps {
  courses: Course[]
  salesmen: Profile[]
}

export function MeetingForm({ courses, salesmen }: MeetingFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visibility, setVisibility] = useState<'invited' | 'public'>('invited')
  const [selectedSalesmen, setSelectedSalesmen] = useState<string[]>([])
  
  const toggleSalesman = (id: string) => {
    setSelectedSalesmen(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      
      const payload = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        scheduled_at: formData.get('scheduled_at') as string,
        course_id: formData.get('course_id') as string || undefined,
        visibility,
        invitee_ids: visibility === 'invited' ? selectedSalesmen : []
      }
      
      const result = await createMeeting(payload)
      if (result.error) {
        alert(result.error)
      } else {
        router.push('/admin/meetings')
        router.refresh()
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred while creating the meeting.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Meeting Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-4 py-2 border"
            placeholder="E.g., Weekly Sales Sync"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-4 py-2 border"
            placeholder="What is this meeting about?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700">Scheduled At *</label>
            <input
              type="datetime-local"
              id="scheduled_at"
              name="scheduled_at"
              required
              className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-4 py-2 border"
            />
          </div>

          <div>
            <label htmlFor="course_id" className="block text-sm font-medium text-gray-700">Link to Course (Optional)</label>
            <select
              id="course_id"
              name="course_id"
              className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-4 py-2 border bg-white"
            >
              <option value="">No Course Linked</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="invited"
                checked={visibility === 'invited'}
                onChange={() => setVisibility('invited')}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Specific Salesmen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Public (Anyone with link)</span>
            </label>
          </div>
        </div>

        {visibility === 'invited' && (
          <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50 max-h-64 overflow-y-auto">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Invitees</label>
            <div className="space-y-2">
              {salesmen.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No salesmen found.</p>
              ) : (
                salesmen.map(salesman => (
                  <label key={salesman.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedSalesmen.includes(salesman.id)}
                      onChange={() => toggleSalesman(salesman.id)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-3">
                      {salesman.avatar_url ? (
                        <img src={salesman.avatar_url} alt={salesman.full_name} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                          {salesman.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{salesman.full_name}</p>
                        <p className="text-xs text-gray-500">{salesman.email}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || (visibility === 'invited' && selectedSalesmen.length === 0)}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Scheduling...' : 'Generate & Schedule'}
        </button>
      </div>
    </form>
  )
}
