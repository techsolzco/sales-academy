'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitEnrollmentApplication } from '@/lib/actions/enrollment'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function EnrollmentForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    knowledge_level: '',
    desired_course: '',
    reason: '',
    prior_experience: ''
  })

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await submitEnrollmentApplication({
      ...formData,
      knowledge_level: formData.knowledge_level as 'beginner' | 'intermediate' | 'advanced' | undefined,
    })
    setLoading(false)
    if (result.error) {
      alert(result.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-brand-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted! 🎉</h2>
        <p className="text-gray-500 mb-6">Your application has been submitted! We'll review it and notify you by email once approved.</p>
        <button
          onClick={() => router.push('/auth/login')}
          className="bg-brand-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-700 transition"
        >
          Return to Login
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-brand-600 p-8 text-white">
        <h1 className="text-2xl font-bold mb-2">Apply to Join as a Sales Intern</h1>
        <p className="text-brand-100">Submit your application below. Our team will review it and get back to you within 1-2 business days.</p>
        
        <div className="flex items-center gap-2 mt-6">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-brand-400/30'}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-brand-400/30'}`} />
          <span className="text-xs font-medium ml-2">Step {step}/2</span>
        </div>
      </div>

      <div className="p-8">
        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.fullName')}</label>
              <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.email')}</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.phone')}</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.password')}</label>
              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button type="submit" className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition mt-6">
              Next Step
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.knowledgeLevel')}</label>
              <select required value={formData.knowledge_level} onChange={e => setFormData({...formData, knowledge_level: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select Level...</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.desiredCourse')}</label>
              <input required type="text" value={formData.desired_course} onChange={e => setFormData({...formData, desired_course: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.reason')}</label>
              <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.priorExperience')}</label>
              <textarea required value={formData.prior_experience} onChange={e => setFormData({...formData, prior_experience: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" rows={3} />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition">
                Back
              </button>
              <button disabled={loading} type="submit" className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition flex items-center justify-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Intern Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
