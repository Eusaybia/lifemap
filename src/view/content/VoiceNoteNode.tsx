'use client'

import './MentionList.scss'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import {
  AUDIO_BITS_PER_SECOND,
  getLocalAudioBlob,
  pickAudioMimeType,
  storeLocalAudio,
  uploadAudio,
} from './voice-note-storage'

// ============================================================================
// VoiceNoteNodeView
//
// The pill shell reuses the pomodoro styling exactly (.pomodoro-* classes), but
// the body is an audio spectrogram and the green play triangle becomes a red
// record circle. States:
//   idle      → faint placeholder bars + red record button
//   recording → live AnalyserNode bars + stop button (LOCAL state only)
//   recorded  → captured waveform; press play to hear it; bars track progress
//
// STORAGE ARCHITECTURE (see voice-note-storage.ts and the commit history):
//   - Only a small *reference* lives in the node attrs, and therefore in Yjs:
//       audioId   — stable key into the local IndexedDB cache
//       remoteUrl — Vercel Blob URL, populated by a background upload
//       duration  — seconds
//       waveform  — spectrogram peaks (tiny array, fine to sync)
//   - The audio bytes NEVER enter the document. They travel out-of-band: cached
//     locally by audioId and uploaded to the cloud. Yjs converges the pointer;
//     the storage layer converges the bytes, independently.
//   - The 'recording' phase is device-local React state and is never written to
//     the doc, so a live recording is not synced to collaborators and does not
//     churn the CRDT. Only idle → (recorded + reference) is committed, in one
//     atomic updateAttributes call when recording stops.
// ============================================================================

const BAR_COUNT = 28

const formatElapsed = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const Spectrogram: React.FC<{
  levels: number[]
  progress?: number
  variant: 'idle' | 'recording' | 'recorded'
}> = ({ levels, progress = 1, variant }) => {
  return (
    <span className={`voice-note-spectrogram voice-note-spectrogram-${variant}`} aria-hidden="true">
      {levels.map((level, i) => {
        const played = i / levels.length <= progress
        const height = Math.max(0.12, Math.min(1, level))
        return (
          <span
            key={i}
            className={`voice-note-bar ${played ? 'voice-note-bar-played' : ''}`}
            style={{ height: `${height * 100}%` }}
          />
        )
      })}
    </span>
  )
}

const flatLevels = (value: number) => Array.from({ length: BAR_COUNT }, () => value)

// Decode the base64 payload the native recorder hands back into raw bytes so we
// can rebuild a Blob and feed it through the same storage lanes as the browser
// MediaRecorder path.
const base64ToUint8 = (base64: string): Uint8Array => {
  const chars = atob(base64)
  const bytes = new Uint8Array(chars.length)
  for (let i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i)
  return bytes
}

// The web editor runs from a file:// origin inside WKWebView, where getUserMedia
// is blocked. When this bridge is present we delegate capture to native AVFoundation.
const getNativeVoiceBridge = (): { postMessage: (msg: any) => void } | null => {
  if (typeof window === 'undefined') return null
  return (window as any).webkit?.messageHandlers?.kairosVoiceNote ?? null
}

// Down-sample a stream of captured peaks into a fixed-width spectrogram.
const peaksToBars = (peaks: number[]): number[] => {
  if (!peaks.length) return flatLevels(0.4)
  const bars: number[] = []
  const chunk = peaks.length / BAR_COUNT
  for (let i = 0; i < BAR_COUNT; i++) {
    const start = Math.floor(i * chunk)
    const end = Math.max(start + 1, Math.floor((i + 1) * chunk))
    let peak = 0
    for (let j = start; j < end; j++) peak = Math.max(peak, peaks[j] || 0)
    bars.push(peak)
  }
  return bars
}

const VoiceNoteNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, selected } = props
  const { status, audioId, remoteUrl, duration, waveform } = node.attrs

  // Recording is LOCAL-ONLY: it never touches the synced document. The doc
  // status is either 'idle' or 'recorded'; this drives the recording overlay.
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveLevels, setLiveLevels] = useState<number[]>(() => flatLevels(0.15))
  const [playProgress, setPlayProgress] = useState(0)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number>(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const capturedPeaksRef = useRef<number[]>([])

  const effectiveStatus: 'idle' | 'recording' | 'recorded' =
    isRecording ? 'recording' : status === 'recorded' ? 'recorded' : 'idle'

  const storedWaveform: number[] =
    Array.isArray(waveform) && waveform.length ? waveform : flatLevels(0.4)

  // Resolve a playable source: local cache (by audioId) first, remoteUrl next.
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setResolvedSrc(null)

    if (status === 'recorded' && (audioId || remoteUrl)) {
      const resolve = async () => {
        if (audioId) {
          try {
            const blob = await getLocalAudioBlob(audioId)
            if (cancelled) return
            if (blob) {
              objectUrl = URL.createObjectURL(blob)
              setResolvedSrc(objectUrl)
              return
            }
          } catch {
            // fall through to remoteUrl
          }
        }
        if (!cancelled && remoteUrl) setResolvedSrc(remoteUrl)
      }
      resolve()
    }

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [status, audioId, remoteUrl])

  // Tick elapsed display while recording.
  useEffect(() => {
    if (!isRecording) return
    const interval = setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000)
    }, 250)
    return () => clearInterval(interval)
  }, [isRecording])

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
      audioElRef.current?.pause()
    }
  }, [])

  const runAnalyser = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const bins = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(bins)

    const levels: number[] = []
    const step = Math.floor(bins.length / BAR_COUNT) || 1
    let runningPeak = 0
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += bins[i * step + j] || 0
      const level = (sum / step) / 255
      levels.push(level)
      runningPeak = Math.max(runningPeak, level)
    }
    setLiveLevels(levels)
    capturedPeaksRef.current.push(runningPeak)
    rafRef.current = requestAnimationFrame(runAnalyser)
  }, [])

  // Shared finish path for both capture backends: cache bytes locally, commit
  // the reference into the doc (single atomic Yjs write), then background-upload.
  const commitRecording = useCallback(
    (blob: Blob, recordedSeconds: number, peaks: number[]) => {
      const bars = peaksToBars(peaks)
      const newAudioId = `voice-note:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      storeLocalAudio(newAudioId, blob)
        .catch(err => console.log('VoiceNote: local cache failed', err))
        .finally(() => {
          setIsRecording(false)
          updateAttributes({
            status: 'recorded',
            audioId: newAudioId,
            duration: Math.round(recordedSeconds),
            waveform: bars,
          })
        })

      uploadAudio(newAudioId, blob)
        .then(url => updateAttributes({ remoteUrl: url }))
        .catch(err => console.log('VoiceNote: upload deferred', err?.message || err))
    },
    [updateAttributes],
  )

  // Native (AVFoundation) capture. Returns true if the native bridge handled it.
  const startNativeRecording = useCallback((): boolean => {
    const bridge = getNativeVoiceBridge()
    if (!bridge) return false
    capturedPeaksRef.current = []
    setLiveLevels(flatLevels(0.12))
    startedAtRef.current = Date.now()
    setElapsed(0)
    setIsRecording(true)
    bridge.postMessage({ action: 'start', nodeId: node.attrs.id })
    return true
  }, [node.attrs.id])

  // Receive live meter samples and the finished recording from native.
  useEffect(() => {
    const myId = node.attrs.id
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {}
      if (detail.nodeId !== myId) return
      switch (detail.command) {
        case 'voiceNoteLevel': {
          const level = typeof detail.level === 'number' ? detail.level : 0
          capturedPeaksRef.current.push(level)
          setLiveLevels(prev => [...prev, level].slice(-BAR_COUNT))
          break
        }
        case 'voiceNoteComplete': {
          const recordedSeconds =
            typeof detail.duration === 'number'
              ? detail.duration
              : (Date.now() - startedAtRef.current) / 1000
          const blob = new Blob([base64ToUint8(detail.base64 || '')], {
            type: detail.mimeType || 'audio/mp4',
          })
          commitRecording(blob, recordedSeconds, capturedPeaksRef.current.slice())
          break
        }
        case 'voiceNotePermissionDenied':
          console.log('VoiceNote: microphone permission denied (native)')
          setIsRecording(false)
          break
        case 'voiceNoteError':
          console.log('VoiceNote: native recorder error', detail.message)
          setIsRecording(false)
          break
      }
    }
    window.addEventListener('kairos-native-editor-command', handler as EventListener)
    return () => window.removeEventListener('kairos-native-editor-command', handler as EventListener)
  }, [node.attrs.id, commitRecording])

  const handleRecord = useCallback(async () => {
    if (startNativeRecording()) return
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.log('VoiceNote: getUserMedia not available (expected on file:// iOS; native capture bridge handles this)')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      capturedPeaksRef.current = []

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioCtx()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = pickAudioMimeType()
      const recorder = new MediaRecorder(
        stream,
        mimeType
          ? { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND }
          : { audioBitsPerSecond: AUDIO_BITS_PER_SECOND },
      )
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        const recordedSeconds = (Date.now() - startedAtRef.current) / 1000
        commitRecording(blob, recordedSeconds, capturedPeaksRef.current.slice())

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        stream.getTracks().forEach(t => t.stop())
        audioCtx.close().catch(() => {})
        streamRef.current = null
        analyserRef.current = null
      }

      startedAtRef.current = Date.now()
      setElapsed(0)
      recorder.start()
      setIsRecording(true)
      rafRef.current = requestAnimationFrame(runAnalyser)
    } catch (err) {
      console.log('VoiceNote: microphone permission denied or failed', err)
    }
  }, [startNativeRecording, commitRecording, runAnalyser])

  const handleStop = useCallback(() => {
    const bridge = getNativeVoiceBridge()
    if (bridge) {
      bridge.postMessage({ action: 'stop', nodeId: node.attrs.id })
      return
    }
    mediaRecorderRef.current?.stop()
  }, [node.attrs.id])

  // Auto-start capture the moment a fresh node is inserted. This fires once per
  // mount, only for a brand-new node (idle, no audioId yet) on this device, so
  // it never re-triggers when an already-recorded node loads or syncs in. If
  // the mic is unavailable/denied, handleRecord just logs and we fall back to
  // the idle record button for a manual retry.
  const hasAutoStartedRef = useRef(false)
  useEffect(() => {
    if (hasAutoStartedRef.current) return
    if (status === 'idle' && !audioId && !isRecording) {
      hasAutoStartedRef.current = true
      handleRecord()
    }
  }, [status, audioId, isRecording, handleRecord])

  const handlePlayback = useCallback(() => {
    if (!resolvedSrc) return
    if (isPlaying) {
      audioElRef.current?.pause()
      setIsPlaying(false)
      return
    }
    const audio = new Audio(resolvedSrc)
    audioElRef.current = audio
    audio.ontimeupdate = () => {
      if (audio.duration) setPlayProgress(audio.currentTime / audio.duration)
    }
    audio.onended = () => {
      setIsPlaying(false)
      setPlayProgress(0)
    }
    audio.play().then(() => setIsPlaying(true)).catch(err => {
      console.log('VoiceNote: playback failed', err)
      setIsPlaying(false)
    })
  }, [resolvedSrc, isPlaying])

  // Idle: faint placeholder bars + red record button.
  if (effectiveStatus === 'idle') {
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-unrealized voice-note-node ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <button className="voice-note-record-btn" onClick={handleRecord} title="Start recording">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
        <Spectrogram levels={flatLevels(0.2)} variant="idle" />
      </NodeViewWrapper>
    )
  }

  // Recording: live spectrogram + elapsed + stop button.
  if (effectiveStatus === 'recording') {
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-active voice-note-node ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <button className="voice-note-stop-btn" onClick={handleStop} title="Stop recording">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
        <Spectrogram levels={liveLevels} variant="recording" />
        <span className="voice-note-elapsed">{formatElapsed(elapsed)}</span>
      </NodeViewWrapper>
    )
  }

  // Recorded: stored waveform + playback button + duration.
  return (
    <NodeViewWrapper
      as="span"
      className={`pomodoro-node pomodoro-completed voice-note-node ${selected ? 'selected' : ''}`}
      data-id={node.attrs.id}
    >
      <button
        className="voice-note-play-btn"
        onClick={handlePlayback}
        title={isPlaying ? 'Pause playback' : 'Play recording'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>
      <Spectrogram levels={storedWaveform} progress={isPlaying ? playProgress : 1} variant="recorded" />
      {duration > 0 && <span className="voice-note-elapsed">{formatElapsed(duration)}</span>}
    </NodeViewWrapper>
  )
}

// ============================================================================
// TipTap Extension
// ============================================================================

export interface VoiceNoteOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    voiceNote: {
      insertVoiceNote: (attributes?: { label?: string }) => ReturnType
    }
  }
}

export const VoiceNoteNode = Node.create<VoiceNoteOptions>({
  name: 'voiceNote',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({ 'data-label': attributes.label }),
      },
      status: {
        default: 'idle',
        parseHTML: element => element.getAttribute('data-status') || 'idle',
        renderHTML: attributes => ({ 'data-status': attributes.status }),
      },
      // Stable key into the local IndexedDB audio cache. The bytes live there,
      // not in the document.
      audioId: {
        default: null,
        parseHTML: element => element.getAttribute('data-audio-id'),
        renderHTML: attributes => {
          if (!attributes.audioId) return {}
          return { 'data-audio-id': attributes.audioId }
        },
      },
      // Cloud (Vercel Blob) URL, populated by the background upload.
      remoteUrl: {
        default: null,
        parseHTML: element => element.getAttribute('data-remote-url'),
        renderHTML: attributes => {
          if (!attributes.remoteUrl) return {}
          return { 'data-remote-url': attributes.remoteUrl }
        },
      },
      duration: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-duration') || '0'),
        renderHTML: attributes => ({ 'data-duration': attributes.duration }),
      },
      // Spectrogram peaks — small enough to live inline in the synced doc.
      waveform: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('data-waveform')
          if (!raw) return null
          try { return JSON.parse(raw) } catch { return null }
        },
        renderHTML: attributes => {
          if (!attributes.waveform) return {}
          return { 'data-waveform': JSON.stringify(attributes.waveform) }
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({ 'data-id': attributes.id || `voice-note:${Date.now()}` }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="voice-note"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const { duration } = node.attrs
    const displayText = duration > 0 ? `🎙️ Voice note (${formatElapsed(duration)})` : '🎙️ Voice note'
    return ['span', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'voice-note' }
    ), displayText]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VoiceNoteNodeView)
  },

  addCommands() {
    return {
      insertVoiceNote:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...attributes,
              id: `voice-note:${Date.now()}`,
              status: 'idle',
              audioId: null,
              remoteUrl: null,
              duration: 0,
              waveform: null,
            },
          })
        },
    }
  },
})
