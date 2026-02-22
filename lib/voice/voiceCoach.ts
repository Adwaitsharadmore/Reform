/**
 * Voice Coach Module
 * 
 * Provides text-to-speech functionality for real-time exercise coaching.
 * Uses Web Speech API (window.speechSynthesis) - client-side only.
 * 
 * Browser Support:
 * - Chrome/Edge: Full support
 * - Safari: Full support (iOS 7+, macOS 10.14+)
 * - Firefox: Partial support (may require user interaction)
 * 
 * Permissions:
 * - No explicit permissions needed, but browsers may block autoplay
 * - User interaction (e.g., clicking "Enable voice") typically required for first speech
 */

interface VoiceSettings {
  enabled: boolean
  voiceURI: string | null
  rate: number // 0.8 - 1.2
  volume: number // 0.0 - 1.0
}

interface SpeakOptions {
  priority?: number // Higher priority can interrupt current speech
}

class VoiceCoach {
  private enabled: boolean = false
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private voices: SpeechSynthesisVoice[] = []
  private selectedVoiceURI: string | null = null
  private rate: number = 1.0
  private volume: number = 1.0
  private lastSpoken: Map<string, number> = new Map() // phrase -> timestamp
  private cooldownMs: number = 2000 // Minimum time between same phrase (2 seconds)
  private minIntervalMs: number = 2000 // Minimum time between any speech (2 seconds)
  private lastSpeechTime: number = 0
  private initialized: boolean = false

  /**
   * Initialize the voice coach and load available voices
   * Should be called once when the component mounts
   */
  async initVoiceCoach(): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[VoiceCoach] Web Speech API not available')
      return
    }

    // Load voices (may be async on some browsers)
    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices()
      // Prefer English voices, fallback to first available
      const englishVoice = this.voices.find(
        (v) => v.lang.startsWith('en') && v.localService
      ) || this.voices.find((v) => v.lang.startsWith('en')) || this.voices[0]
      
      if (englishVoice) {
        this.selectedVoiceURI = englishVoice.voiceURI
      }
    }

    loadVoices()
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== null) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    // Load settings from localStorage
    this.loadSettings()

    this.initialized = true
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('voiceCoachSettings')
      if (stored) {
        const settings: VoiceSettings = JSON.parse(stored)
        this.enabled = settings.enabled ?? false
        this.selectedVoiceURI = settings.voiceURI ?? this.selectedVoiceURI
        this.rate = settings.rate ?? 1.0
        this.volume = settings.volume ?? 1.0
      }
    } catch (e) {
      console.warn('[VoiceCoach] Failed to load settings:', e)
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const settings: VoiceSettings = {
        enabled: this.enabled,
        voiceURI: this.selectedVoiceURI,
        rate: this.rate,
        volume: this.volume,
      }
      localStorage.setItem('voiceCoachSettings', JSON.stringify(settings))
    } catch (e) {
      console.warn('[VoiceCoach] Failed to save settings:', e)
    }
  }

  /**
   * Speak a phrase with optional priority
   * Respects cooldown and rate limiting
   */
  speak(text: string, opts: SpeakOptions = {}): void {
    if (!this.initialized) {
      console.warn('[VoiceCoach] Not initialized, call initVoiceCoach() first')
      return
    }

    if (!this.enabled) {
      return
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    // Normalize text for cooldown check
    const normalizedText = text.trim().toLowerCase()

    // Check cooldown for this specific phrase
    const lastSpokenTime = this.lastSpoken.get(normalizedText) || 0
    const now = Date.now()
    if (now - lastSpokenTime < this.cooldownMs) {
      return // Still in cooldown
    }

    // Check minimum interval between any speech
    if (now - this.lastSpeechTime < this.minIntervalMs) {
      return // Too soon after last speech
    }

    // If priority is high, interrupt current speech
    const shouldInterrupt = opts.priority && opts.priority > 5 && this.currentUtterance
    if (shouldInterrupt) {
      window.speechSynthesis.cancel()
      this.currentUtterance = null
    } else if (window.speechSynthesis.speaking) {
      // Already speaking and not high priority, skip
      return
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set voice
    if (this.selectedVoiceURI) {
      const voice = this.voices.find((v) => v.voiceURI === this.selectedVoiceURI)
      if (voice) {
        utterance.voice = voice
      }
    }

    utterance.rate = this.rate
    utterance.volume = this.volume

    // Track when speech completes
    utterance.onend = () => {
      this.currentUtterance = null
      this.lastSpeechTime = Date.now()
    }

    utterance.onerror = (e) => {
      console.warn('[VoiceCoach] Speech error:', e)
      this.currentUtterance = null
    }

    // Update tracking
    this.lastSpoken.set(normalizedText, now)
    this.currentUtterance = utterance

    try {
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.error('[VoiceCoach] Failed to speak:', e)
      this.currentUtterance = null
    }
  }

  /**
   * Stop current speech immediately
   */
  stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      this.currentUtterance = null
    }
  }

  /**
   * Enable or disable voice coaching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.stopSpeaking()
    }
    this.saveSettings()
  }

  /**
   * Check if voice coaching is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Set the voice by URI
   */
  setVoice(voiceURI: string | null): void {
    this.selectedVoiceURI = voiceURI
    this.saveSettings()
  }

  /**
   * Set speech rate (0.8 - 1.2)
   */
  setRate(rate: number): void {
    this.rate = Math.max(0.8, Math.min(1.2, rate))
    this.saveSettings()
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0.0, Math.min(1.0, volume))
    this.saveSettings()
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  /**
   * Get current settings
   */
  getSettings(): VoiceSettings {
    return {
      enabled: this.enabled,
      voiceURI: this.selectedVoiceURI,
      rate: this.rate,
      volume: this.volume,
    }
  }

  /**
   * Clear cooldown tracking (useful for testing)
   */
  clearCooldown(): void {
    this.lastSpoken.clear()
    this.lastSpeechTime = 0
  }
}

// Singleton instance
let voiceCoachInstance: VoiceCoach | null = null

export function initVoiceCoach(): Promise<void> {
  if (!voiceCoachInstance) {
    voiceCoachInstance = new VoiceCoach()
  }
  return voiceCoachInstance.initVoiceCoach()
}

export function speak(text: string, opts?: SpeakOptions): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.speak(text, opts)
  }
}

export function stopSpeaking(): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.stopSpeaking()
  }
}

export function setEnabled(enabled: boolean): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.setEnabled(enabled)
  }
}

export function isEnabled(): boolean {
  return voiceCoachInstance?.isEnabled() ?? false
}

export function setVoice(voiceURI: string | null): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.setVoice(voiceURI)
  }
}

export function setRate(rate: number): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.setRate(rate)
  }
}

export function setVolume(volume: number): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.setVolume(volume)
  }
}

export function getVoices(): SpeechSynthesisVoice[] {
  return voiceCoachInstance?.getVoices() ?? []
}

export function getSettings(): VoiceSettings {
  return voiceCoachInstance?.getSettings() ?? {
    enabled: false,
    voiceURI: null,
    rate: 1.0,
    volume: 1.0,
  }
}

export function clearCooldown(): void {
  if (voiceCoachInstance) {
    voiceCoachInstance.clearCooldown()
  }
}

