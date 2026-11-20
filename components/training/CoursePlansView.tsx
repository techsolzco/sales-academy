'use client'

import { useState } from 'react'
import { Check, Smartphone, Monitor, Sparkles, ShieldAlert, Gift, MessageCircle, X, ExternalLink, Clock } from 'lucide-react'
import { CoursePlan, CAPCUT_ENROLMENT_PLANS } from '@/lib/data/capcut-plans'
import { getWhatsAppUrl } from '@/lib/config/site'

interface CoursePlansViewProps {
  plans?: CoursePlan[]
  courseTitle?: string
}

export function CoursePlansView({
  plans = CAPCUT_ENROLMENT_PLANS,
  courseTitle = 'CapCut Pro - Full Course'
}: CoursePlansViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<CoursePlan | null>(null)
  const [filter, setFilter] = useState<'all' | 'monthly' | 'weekly'>('all')

  const filteredPlans = plans.filter(p => {
    if (filter === 'monthly') return p.billingCycle === 'monthly'
    if (filter === 'weekly') return p.billingCycle === 'weekly'
    return true
  })

  function handleOpenEnrolModal(plan: CoursePlan) {
    setSelectedPlan(plan)
  }

  function handleCloseModal() {
    setSelectedPlan(null)
  }

  const getWhatsAppMessage = (plan: CoursePlan) => {
    return `Assalam-o-Alaikum, I want to enrol in the CapCut Pro course plan:
- Plan: ${plan.name}
- Price: ${plan.priceDisplay}
- Devices: ${plan.devices}
- Duration: ${plan.duration}
- AI Credits: ${plan.aiCredits}

I am attaching my payment screenshot for manual verification. Please activate my enrolment.`
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Manual Enrolment Notice */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-700/60 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Official Enrolment Plans
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" /> 3 FREE Digital Asset Packs Included
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CapCut Pro Enrolment Plans & Pricing
          </h2>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Choose your device package and AI credits tier. All 7 plans include full access to the course and complimentary digital creator bonuses.
          </p>

          {/* Strict Notice Box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-xs sm:text-sm space-y-1.5 mt-4">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Important: Manual Enrolment & Device Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-100/90 pl-1">
              <li><strong>Manual Enrolment Only:</strong> After payment, enrolment is done manually by the team after verification. No automatic enrolments.</li>
              <li><strong>Device Rule:</strong> 2 Devices means Mobile + PC. PC editing requires the 2-device plan. 1 Device plan is Mobile only.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Filter:</span>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            filter === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          All Plans (7)
        </button>
        <button
          onClick={() => setFilter('monthly')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            filter === 'monthly'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Monthly Plans (6)
        </button>
        <button
          onClick={() => setFilter('weekly')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            filter === 'weekly'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Weekly Plan (1)
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => {
          const isTwoDevice = plan.devices.includes('2 Devices')
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg ${
                plan.isPopular
                  ? 'bg-white dark:bg-gray-800 border-brand-500 ring-2 ring-brand-500/20'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div>
                {/* Popular Pill */}
                {plan.isPopular && (
                  <div className="bg-brand-600 text-white text-[11px] font-bold text-center py-1 uppercase tracking-wider">
                    Most Popular Choice
                  </div>
                )}
                {plan.isWeekly && (
                  <div className="bg-purple-600 text-white text-[11px] font-bold text-center py-1 uppercase tracking-wider">
                    7 Days Weekly Plan
                  </div>
                )}

                <div className="p-6 space-y-4">
                  {/* Name and Device Type */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug">
                      {plan.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${
                        isTwoDevice
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {isTwoDevice ? <><Smartphone className="w-3.5 h-3.5" /><Monitor className="w-3.5 h-3.5" /> 2 Devices (Mobile + PC)</> : <><Smartphone className="w-3.5 h-3.5" /> 1 Device (Mobile only)</>}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <Clock className="w-3 h-3" /> {plan.duration}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {plan.priceDisplay}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        / {plan.billingCycle}
                      </span>
                    </div>
                  </div>

                  {/* AI Credits Badge */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-600/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>AI Credits:</span>
                      <span className="text-brand-600 dark:text-brand-400 font-bold">{plan.aiCredits}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  {/* Mandatory FREE Bonuses Section */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      <Gift className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Every Plan Includes FREE:</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                      {plan.freeBonuses.map((bonus, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>{bonus}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notice Pill */}
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{plan.deviceRuleNotice}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-6 pt-0">
                <button
                  onClick={() => handleOpenEnrolModal(plan)}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm ${
                    plan.isPopular
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : 'bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-gray-900'
                  }`}
                >
                  <span>Enrol in Plan</span>
                  <ExternalLink className="w-4 h-4 opacity-75" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Manual Enrolment Instructions Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-brand-600 p-6 text-white relative">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-200 block mb-1">
                Manual Enrolment Verification
              </span>
              <h3 className="text-xl font-bold">
                {selectedPlan.name} — {selectedPlan.priceDisplay}
              </h3>
              <p className="text-xs text-brand-100 mt-1">
                {selectedPlan.devices} · {selectedPlan.duration} · {selectedPlan.aiCredits}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-sm text-gray-700 dark:text-gray-200 max-h-[75vh] overflow-y-auto">
              {/* Device Rule Reminder */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  Manual Verification & Device Rules:
                </p>
                <p>• <strong>Enrolment is manual only:</strong> After payment, enrolment is done manually by the team after verification. Do NOT auto-grant or expect instant activation without payment proof.</p>
                <p>• <strong>Device Requirement:</strong> 2 Devices means Mobile + PC. PC needs the 2-device plan.</p>
              </div>

              {/* Free Bonuses reminder */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  FREE Bonuses with this Plan:
                </p>
                <p>✓ 500,000 Ready Reels + 50 Premium Mobile Apps + Premium PC Softwares included free.</p>
              </div>

              {/* 3 Simple Steps */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  How to Complete Your Enrolment:
                </h4>
                <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Submit Payment of {selectedPlan.priceDisplay}</p>
                      <p className="text-gray-500 dark:text-gray-400">Pay via EasyPaisa / JazzCash / Bank Transfer to the official academy account.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Save Payment Receipt / Screenshot</p>
                      <p className="text-gray-500 dark:text-gray-400">Take a clear screenshot of the transaction ID and sender details.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Send to Team for Manual Verification</p>
                      <p className="text-gray-500 dark:text-gray-400">Our team will verify the payment and manually enrol your account within minutes.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/923280972212?text=${encodeURIComponent(getWhatsAppMessage(selectedPlan))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Screenshot on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="py-3 px-5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
