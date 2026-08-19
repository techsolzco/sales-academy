'use client'

import { useState } from 'react'
import { requestResellerUpgrade } from '@/lib/actions/reseller'
import { Rocket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function ResellerApplicationForm() {
  const [step, setStep] = useState(1)
  const [learnedSummary, setLearnedSummary] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!agreedToTerms || learnedSummary.length < 50) return
    setLoading(true)
    try {
      await requestResellerUpgrade(learnedSummary)
      setSuccess(true)
    } catch (e) {
      console.error(e)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-green-900 mb-2">Application Submitted!</h2>
        <p className="text-green-700">We will review your pledge and get back to you soon.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="mb-8 text-center">
        <Rocket className="w-12 h-12 text-brand-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Become a Sales Partner</h2>
        <p className="text-gray-500 mt-2">Complete this application to unlock your sales portal.</p>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What have you learned about the tools? How will you use this to sell?
            </label>
            <textarea
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[150px] resize-none"
              placeholder="I have learned that..."
              value={learnedSummary}
              onChange={e => setLearnedSummary(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              {learnedSummary.length}/50 characters minimum
            </p>
          </div>
          <button
            disabled={learnedSummary.length < 50}
            onClick={() => setStep(2)}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50 transition"
          >
            Next Step
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-brand-600" />
              Sales Partner Pledge
            </h3>
            <div className="space-y-2 text-sm text-gray-700 mb-6">
              <p>I pledge that I will:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Act honestly and transparently with all customers</li>
                <li>Follow company pricing and policies strictly</li>
                <li>Not make false claims about any products</li>
                <li>Understand that fraud, dishonesty, or breaking company rules may result in legal action and/or permanent removal from the platform</li>
              </ul>
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-gray-900">
                I agree to the above pledge and terms
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Back
            </button>
            <button
              disabled={!agreedToTerms || loading}
              onClick={handleSubmit}
              className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50 flex justify-center items-center gap-2 transition"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Submit Application
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

