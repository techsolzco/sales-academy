'use client'

export function JitsiEmbed({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      allow="camera; microphone; fullscreen; display-capture"
      className="absolute inset-0 w-full h-full border-none"
      style={{ borderRadius: '16px' }}
    />
  )
}
