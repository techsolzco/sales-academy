'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'

interface DateTimePickerProps {
  value: string // ISO string or empty
  onChange: (iso: string) => void
  label?: string
  required?: boolean
}

export function DateTimePicker({ value, onChange, label, required }: DateTimePickerProps) {
  // Parse incoming value
  const parseDate = (iso: string) => {
    if (!iso) return { date: '', hour: '12', minute: '00', ampm: 'PM' as 'AM' | 'PM' }
    const d = new Date(iso)
    let h = d.getHours()
    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return {
      date: iso.slice(0, 10),
      hour: String(h).padStart(2, '0'),
      minute: String(d.getMinutes()).padStart(2, '0'),
      ampm,
    }
  }

  const parsed = parseDate(value)
  const [date, setDate] = useState(parsed.date)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(parsed.ampm)

  useEffect(() => {
    if (!date) { onChange(''); return }
    let h = parseInt(hour)
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    const d = new Date(`${date}T${String(h).padStart(2, '0')}:${minute}:00`)
    if (!isNaN(d.getTime())) onChange(d.toISOString())
  }, [date, hour, minute, ampm])

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            required={required}
            value={date}
            onChange={e => setDate(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        {/* Hour */}
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={hour}
            onChange={e => setHour(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none"
          >
            {hours.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <span className="text-gray-400 font-bold">:</span>
        {/* Minute */}
        <select
          value={minute}
          onChange={e => setMinute(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {/* AM/PM */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
          {(['AM', 'PM'] as const).map(period => (
            <button
              key={period}
              type="button"
              onClick={() => setAmpm(period)}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                ampm === period
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        {/* Clear */}
        {date && (
          <button
            type="button"
            onClick={() => { setDate(''); onChange('') }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
