import { useRef, useState, useEffect } from 'react'

interface AudioPlayerProps {
  audioUrl: string
  title: string
  sourceUrl?: string
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function AudioPlayer({ audioUrl, title, sourceUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioUrl])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setCurrentTime(Number(e.target.value))
  }

  if (!audioUrl) {
    return (
      <div className="sticky top-0 z-10 bg-mantle border-b border-surface0 px-5 py-3 flex items-center gap-3">
        <span className="text-sm text-red">Audio non disponibile.</span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue hover:underline"
          >
            Visita la sorgente →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-10 bg-mantle border-b border-surface0 px-5 py-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-mauve text-base text-sm
            hover:bg-mauve/90 transition-colors shrink-0"
          aria-label={isPlaying ? 'Pausa' : 'Play'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="4" height="12" rx="1"/>
              <rect x="8" y="1" width="4" height="12" rx="1"/>
            </svg>
          ) : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-mauve h-1"
        />
        <span className="text-subtext0 text-xs tabular-nums shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <p className="text-xs text-subtext0 mt-1.5 truncate">{title}</p>
    </div>
  )
}
