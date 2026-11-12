'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitEnrollmentApplication } from '@/lib/actions/enrollment'
import { requestEmailOtp, verifyEmailOtp } from '@/lib/actions/email-otp'
import { Loader2, CheckCircle2, Camera, Instagram, Facebook, Linkedin, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const inputClass = 'w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-400 text-sm'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export function EnrollmentForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Email OTP verification (must complete before the application can proceed)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpInfo, setOtpInfo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  // 60s resend countdown
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  // Changing the email after verification invalidates the verification
  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }))
    if (otpVerified && value.trim().toLowerCase() !== verifiedEmail) {
      setOtpVerified(false)
      setVerifiedEmail('')
      setOtpSent(false)
      setOtpCode('')
      setOtpInfo(null)
      setOtpError('Email changed — please verify the new email address.')
    }
  }

  const handleSendOtp = async () => {
    const cleanEmail = formData.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setOtpError('Please enter a valid email address first.')
      return
    }
    setOtpBusy(true)
    setOtpError(null)
    setOtpInfo(null)
    const result = await requestEmailOtp(cleanEmail, formData.full_name.trim() || undefined)
    setOtpBusy(false)
    if (result.error) {
      setOtpError(result.error)
      return
    }
    setOtpSent(true)
    setOtpCode('')
    setResendIn(60)
    setOtpInfo('Verification code sent — check your inbox (it expires in 10 minutes).')
  }

  const handleVerifyOtp = async () => {
    const cleanEmail = formData.email.trim().toLowerCase()
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpError('Please enter the 6-digit code sent to your email.')
      return
    }
    setOtpBusy(true)
    setOtpError(null)
    setOtpInfo(null)
    const result = await verifyEmailOtp(cleanEmail, otpCode.trim())
    setOtpBusy(false)
    if (result.error) {
      setOtpError(result.error)
      return
    }
    setOtpVerified(true)
    setVerifiedEmail(cleanEmail)
    setOtpInfo(null)
    setOtpError(null)
  }

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    knowledge_level: '',
    desired_course: '',
    reason: '',
    prior_experience: '',
    avatar_url: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    linkedin: '',
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    // Email must be OTP-verified before the rest of the application proceeds.
    if (!otpVerified) {
      setOtpError('Please verify your email with the 6-digit code before continuing.')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let avatarUrl = formData.avatar_url

    // Upload avatar if selected
    if (avatarFile) {
      setUploadingAvatar(true)
      try {
        const formDataUpload = new FormData()
        formDataUpload.append('file', avatarFile)
        // Upload to a public bucket path (no auth required for enrollment)
        const ext = avatarFile.name.split('.').pop()
        const fileName = `enrollment-${Date.now()}.${ext}`
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(`public/${fileName}`, avatarFile, { upsert: true })
        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
          avatarUrl = urlData.publicUrl
        }
      } catch {
        // Avatar upload failure is non-blocking
      }
      setUploadingAvatar(false)
    }

    const cleanEmail = formData.email.trim().toLowerCase()

    // Server enforces this too — the UI must never submit an unverified email.
    if (!otpVerified || cleanEmail !== verifiedEmail) {
      setLoading(false)
      alert('Please verify your email with the 6-digit code before submitting.')
      setStep(1)
      return
    }

    const result = await submitEnrollmentApplication({
      ...formData,
      email: cleanEmail,
      avatar_url: avatarUrl,
      knowledge_level: formData.knowledge_level as 'beginner' | 'intermediate' | 'advanced' | undefined,
    })

    if (result.error) {
      setLoading(false)
      alert(result.error)
      return
    }

    // Approval model: no account exists yet and nobody is signed in.
    // The application is pending review; the admin approves it and the
    // applicant receives login credentials by email.
    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-brand-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Application Submitted!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Thank you for applying. Our team will review your application within 1–2 business days. If approved, you will receive your login credentials by email.</p>
        <button
          onClick={() => router.push('/auth/login')}
          className="bg-brand-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-700 transition"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
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
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 mb-2">
              <div
                className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-200 dark:border-brand-700 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-brand-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
              >
                {avatarPreview ? 'Change Photo' : 'Upload Profile Photo (Optional)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <label className={labelClass}>{t('register.fullName')}</label>
              <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('register.email')}</label>
              <input required type="email" value={formData.email} onChange={e => handleEmailChange(e.target.value)} className={inputClass} />
            </div>
            {/* Email verification (OTP) — required before continuing */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-3 space-y-2">
              {otpVerified ? (
                <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Email verified: {verifiedEmail}</p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpBusy || resendIn > 0}
                      className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
                    >
                      {otpBusy ? 'Sending…' : otpSent ? (resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code') : 'Send Verification Code'}
                    </button>
                    {otpSent && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Code expires in 10 minutes.</span>
                    )}
                  </div>
                  {otpSent && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit code"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={`${inputClass} tracking-[0.5em] font-mono`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpBusy || otpCode.length !== 6}
                        className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
                      >
                        {otpBusy ? 'Verifying…' : 'Verify'}
                      </button>
                    </div>
                  )}
                </>
              )}
              {otpError && <p className="text-sm text-red-600 dark:text-red-400">{otpError}</p>}
              {otpInfo && <p className="text-sm text-green-600 dark:text-green-400">{otpInfo}</p>}
              {!otpVerified && <p className="text-xs text-gray-500 dark:text-gray-400">We will send a 6-digit code to your email. You must verify it before continuing.</p>}
            </div>
            <div>
              <label className={labelClass}>{t('register.phone')}</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('register.password')}</label>
              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={inputClass} />
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Social Links <span className="font-normal normal-case">(Optional)</span></p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <input type="text" placeholder="WhatsApp number (e.g. +92 300 1234567)" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className={inputClass} />
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
                  <input type="url" placeholder="Instagram profile URL" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className={inputClass} />
                </div>
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <input type="url" placeholder="Facebook profile URL" value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} className={inputClass} />
                </div>
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-blue-700 flex-shrink-0" />
                  <input type="url" placeholder="LinkedIn profile URL" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition mt-6">
              Next Step →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>{t('register.knowledgeLevel')}</label>
              <select required value={formData.knowledge_level} onChange={e => setFormData({...formData, knowledge_level: e.target.value})} className={inputClass}>
                <option value="">Select Level...</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('register.desiredCourse')}</label>
              <input required type="text" value={formData.desired_course} onChange={e => setFormData({...formData, desired_course: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('register.reason')}</label>
              <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className={inputClass} rows={3} />
            </div>
            <div>
              <label className={labelClass}>{t('register.priorExperience')}</label>
              <textarea required value={formData.prior_experience} onChange={e => setFormData({...formData, prior_experience: e.target.value})} className={inputClass} rows={3} />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← Back
              </button>
              <button disabled={loading || uploadingAvatar} type="submit" className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {(loading || uploadingAvatar) ? <><Loader2 className="w-5 h-5 animate-spin" /> {uploadingAvatar ? 'Uploading photo...' : 'Submitting...'}</> : 'Submit Application 🚀'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
