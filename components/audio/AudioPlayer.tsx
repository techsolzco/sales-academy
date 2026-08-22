'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, Volume2, Copy, Check, Search } from 'lucide-react'

interface AudioPlayerProps {
  title: string
  audioUrl: string
  transcript?: string | null
  durationSeconds?: number | null
  purpose?: string | null
  whenToSend?: string | null
  keyPoints?: string[]
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export function AudioPlayer({
  title,
  audioUrl,
  transcript,
  durationSeconds,
  purpose,
  whenToSend,
  keyPoints,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(durationSeconds ?? 0)
  const [speed, setSpeed] = useState(1)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function updateTime() {
      if (audio) setCurrentTime(audio.currentTime)
    }
    function updateDuration() {
      if (audio && audio.duration) setDuration(audio.duration)
    }
    function handleEnded() {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  function handleCopyTranscript() {
    if (!transcript) return
    navigator.clipboard.writeText(transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Highlight search term in transcript
  function renderTranscript() {
    if (!transcript) return <p className="text-gray-400 text-xs italic">No transcript available.</p>
    if (!search.trim()) return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>

    const parts = transcript.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-1">{part}</mark>
          ) : (
            part
          )
        )}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header */}
      <div>
        <h3 className="font-semibold text-gray-900 text-base mb-1">{title}</h3>
        {purpose && <p className="text-xs text-gray-500">{purpose}</p>}
      </div>

      {/* Player Controls */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition flex-shrink-0 shadow-sm"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/60">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-400 mr-1.5">Speed:</span>
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                  speed === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {whenToSend && (
            <span className="text-xs text-gray-400 break-words min-w-0" title={whenToSend}>
              💡 Send when: {whenToSend}
            </span>
          )}
        </div>
      </div>

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key Points</p>
          <div className="flex flex-wrap gap-1.5">
            {keyPoints.map((kp, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium">
                • {kp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transcript</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 pr-2 py-1 rounded-md border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 w-36"
                />
              </div>
            </div>

            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Transcript'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 max-h-48 overflow-y-auto">
            {renderTranscript()}
          </div>
        </div>
      )}
    </div>
  )
}
