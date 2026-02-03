'use client'

import './MentionList.scss'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { motion } from 'framer-motion'
import { PluginKey } from '@tiptap/pm/state'

// Unique plugin key to avoid conflicts with other extensions
const TimePointPluginKey = new PluginKey('timepoint-suggestion')

// ============================================================================
// Types
// ============================================================================

export interface TimePoint {
  id: string
  label: string
  date: Date
  emoji: string
}

interface TimePointListProps extends SuggestionProps {
  items: TimePoint[]
}

type TimePointListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Date Helpers
// ============================================================================

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const NORTHERN_SEASON_MARKERS = [
  { name: 'Spring', month: 2, day: 20, emoji: '🌸' },
  { name: 'Summer', month: 5, day: 21, emoji: '☀️' },
  { name: 'Autumn', month: 8, day: 22, emoji: '🍂' },
  { name: 'Winter', month: 11, day: 21, emoji: '❄️' },
]

const getSeasonMarkersForUser = () => {
  const location = cachedLocation || getStoredLocation()
  const isSouthernHemisphere = location.latitude < 0
  if (!isSouthernHemisphere) return NORTHERN_SEASON_MARKERS

  // Southern Hemisphere swaps Spring/Autumn and Summer/Winter markers.
  return [
    { name: 'Spring', month: 8, day: 22, emoji: '🌸' },  // Sep equinox
    { name: 'Summer', month: 11, day: 21, emoji: '☀️' }, // Dec solstice
    { name: 'Autumn', month: 2, day: 20, emoji: '🍂' },   // Mar equinox
    { name: 'Winter', month: 5, day: 21, emoji: '❄️' },   // Jun solstice
  ]
}

const getNextSeason = (): { name: string; date: Date; emoji: string } => {
  const now = new Date()
  const year = now.getFullYear()
  
  const seasonMarkers = getSeasonMarkersForUser()
  const candidates = seasonMarkers.map((season) => ({
    ...season,
    date: new Date(year, season.month, season.day),
  }))
  
  const upcoming = candidates.find((season) => season.date >= now)
  if (upcoming) {
    return { name: upcoming.name, date: upcoming.date, emoji: upcoming.emoji }
  }
  
  const nextYear = year + 1
  const firstSeason = seasonMarkers[0]
  return {
    name: firstSeason.name,
    date: new Date(nextYear, firstSeason.month, firstSeason.day),
    emoji: firstSeason.emoji,
  }
}

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }
  return date.toLocaleDateString('en-GB', options)
}

const formatDateWithDay = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }
  return date.toLocaleDateString('en-GB', options)
}

// ============================================================================
// Solar Time Calculations
// ============================================================================

interface UserLocation {
  latitude: number
  longitude: number
  timezone: number // offset in hours from UTC
  locationName?: string
}

interface SolarTimes {
  astronomicalDawn: Date
  nauticalDawn: Date
  civilDawn: Date
  sunrise: Date
  goldenHourEnd: Date
  solarNoon: Date
  goldenHourStart: Date
  sunset: Date
  civilDusk: Date
  nauticalDusk: Date
  astronomicalDusk: Date
}

const LOCATION_STORAGE_KEY = 'lifemap-user-location'

// Default location (Sydney, Australia) - will be overridden by geolocation
const DEFAULT_LOCATION: UserLocation = {
  latitude: -33.8688,
  longitude: 151.2093,
  timezone: 11, // AEDT
  locationName: 'Sydney'
}

// Get stored location or default
const getStoredLocation = (): UserLocation => {
  if (typeof window === 'undefined') return DEFAULT_LOCATION
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load location:', e)
  }
  return DEFAULT_LOCATION
}

// Store location
const storeLocation = (location: UserLocation): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch (e) {
    console.error('Failed to store location:', e)
  }
}

// Request browser geolocation and update stored location
const requestGeolocation = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(getStoredLocation())
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: -new Date().getTimezoneOffset() / 60,
          locationName: 'Current Location'
        }
        storeLocation(location)
        resolve(location)
      },
      (error) => {
        console.log('Geolocation error:', error.message)
        resolve(getStoredLocation())
      },
      { timeout: 5000, maximumAge: 3600000 } // 1 hour cache
    )
  })
}

// Convert degrees to radians
const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

// Convert radians to degrees
const toDegrees = (radians: number): number => radians * (180 / Math.PI)

// Calculate Julian Day Number
const getJulianDay = (date: Date): number => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

// Calculate solar declination (angle of sun relative to equator)
const getSolarDeclination = (julianDay: number): number => {
  const n = julianDay - 2451545.0 // Days since J2000.0
  const L = (280.460 + 0.9856474 * n) % 360 // Mean longitude
  const g = toRadians((357.528 + 0.9856003 * n) % 360) // Mean anomaly
  const lambda = toRadians(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) // Ecliptic longitude
  const epsilon = toRadians(23.439 - 0.0000004 * n) // Obliquity of ecliptic
  
  return toDegrees(Math.asin(Math.sin(epsilon) * Math.sin(lambda)))
}

// Calculate Equation of Time (difference between solar time and clock time)
const getEquationOfTime = (julianDay: number): number => {
  const n = julianDay - 2451545.0
  const L = toRadians((280.460 + 0.9856474 * n) % 360)
  const g = toRadians((357.528 + 0.9856003 * n) % 360)
  const epsilon = toRadians(23.439 - 0.0000004 * n)
  
  const y = Math.tan(epsilon / 2) ** 2
  const eot = y * Math.sin(2 * L) - 2 * 0.0167 * Math.sin(g) + 4 * 0.0167 * y * Math.sin(g) * Math.cos(2 * L)
  
  return toDegrees(eot) * 4 // Convert to minutes
}

// Calculate hour angle for a given solar elevation angle
const getHourAngle = (latitude: number, declination: number, elevation: number): number | null => {
  const latRad = toRadians(latitude)
  const decRad = toRadians(declination)
  const elevRad = toRadians(elevation)
  
  const cosH = (Math.sin(elevRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad))
  
  // Check if sun rises/sets at this location on this day
  if (cosH > 1) return null // Sun never rises (polar night)
  if (cosH < -1) return null // Sun never sets (midnight sun)
  
  return toDegrees(Math.acos(cosH))
}

// Calculate solar noon time
const getSolarNoon = (location: UserLocation, date: Date): Date => {
  const julianDay = getJulianDay(date)
  const eot = getEquationOfTime(julianDay)
  
  // Solar noon in minutes from midnight UTC
  const solarNoonUTC = 720 - (location.longitude * 4) - eot
  
  // Convert to local time
  const solarNoonLocal = solarNoonUTC + (location.timezone * 60)
  
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setMinutes(Math.round(solarNoonLocal))
  
  return result
}

// Calculate time for a specific solar elevation angle
const getSolarEventTime = (location: UserLocation, date: Date, elevation: number, isRising: boolean): Date | null => {
  const julianDay = getJulianDay(date)
  const declination = getSolarDeclination(julianDay)
  const hourAngle = getHourAngle(location.latitude, declination, elevation)
  
  if (hourAngle === null) return null
  
  const solarNoon = getSolarNoon(location, date)
  const offset = (hourAngle / 15) * 60 // Convert degrees to minutes
  
  const result = new Date(solarNoon)
  if (isRising) {
    result.setMinutes(result.getMinutes() - Math.round(offset))
  } else {
    result.setMinutes(result.getMinutes() + Math.round(offset))
  }
  
  return result
}

// Calculate all solar times for a given date and location
const calculateSolarTimes = (location: UserLocation, date: Date = new Date()): SolarTimes => {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  // Standard solar elevation angles:
  // Sunrise/Sunset: -0.833° (accounting for refraction and sun's radius)
  // Civil twilight: -6°
  // Nautical twilight: -12°
  // Astronomical twilight: -18°
  // Golden hour: 6° above horizon
  
  const solarNoon = getSolarNoon(location, today)
  
  return {
    astronomicalDawn: getSolarEventTime(location, today, -18, true) || new Date(today.setHours(4, 0, 0)),
    nauticalDawn: getSolarEventTime(location, today, -12, true) || new Date(today.setHours(4, 30, 0)),
    civilDawn: getSolarEventTime(location, today, -6, true) || new Date(today.setHours(5, 0, 0)),
    sunrise: getSolarEventTime(location, today, -0.833, true) || new Date(today.setHours(6, 0, 0)),
    goldenHourEnd: getSolarEventTime(location, today, 6, true) || new Date(today.setHours(7, 0, 0)),
    solarNoon,
    goldenHourStart: getSolarEventTime(location, today, 6, false) || new Date(today.setHours(17, 0, 0)),
    sunset: getSolarEventTime(location, today, -0.833, false) || new Date(today.setHours(18, 0, 0)),
    civilDusk: getSolarEventTime(location, today, -6, false) || new Date(today.setHours(18, 30, 0)),
    nauticalDusk: getSolarEventTime(location, today, -12, false) || new Date(today.setHours(19, 0, 0)),
    astronomicalDusk: getSolarEventTime(location, today, -18, false) || new Date(today.setHours(19, 30, 0)),
  }
}

// Format time as HH:MM for solar events
const formatSolarTime = (date: Date): string => {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// Cached location and solar times
let cachedLocation: UserLocation | null = null
let cachedSolarTimes: SolarTimes | null = null
let lastCalculationDate: string | null = null

// Get solar times (with caching)
const getSolarTimesForToday = (): SolarTimes => {
  const today = new Date().toDateString()
  
  if (cachedSolarTimes && lastCalculationDate === today) {
    return cachedSolarTimes
  }
  
  if (!cachedLocation) {
    cachedLocation = getStoredLocation()
    // Also trigger geolocation update in background
    requestGeolocation().then(loc => {
      cachedLocation = loc
      cachedSolarTimes = calculateSolarTimes(loc)
      lastCalculationDate = today
    })
  }
  
  cachedSolarTimes = calculateSolarTimes(cachedLocation)
  lastCalculationDate = today
  
  return cachedSolarTimes
}

// ============================================================================
// Lunar Phase Calculations
// ============================================================================

// Synodic month (average time between new moons) in days
const SYNODIC_MONTH = 29.53058867

// Known new moon reference date (January 6, 2000 at 18:14 UTC)
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))

/**
 * Calculate the current lunar age (days since last new moon)
 */
const getLunarAge = (date: Date = new Date()): number => {
  const daysSinceKnown = (date.getTime() - KNOWN_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24)
  const lunarAge = daysSinceKnown % SYNODIC_MONTH
  return lunarAge < 0 ? lunarAge + SYNODIC_MONTH : lunarAge
}

/**
 * Check if user is in Southern Hemisphere based on stored location
 * In the Southern Hemisphere, the moon appears "flipped" horizontally
 */
const isInSouthernHemisphere = (): boolean => {
  const location = cachedLocation || getStoredLocation()
  return location.latitude < 0
}

/**
 * Get hemisphere-aware quarter moon emojis
 * In Southern Hemisphere, First Quarter appears with left side lit (like 🌗 in Northern)
 * and Last Quarter appears with right side lit (like 🌓 in Northern)
 */
const getQuarterMoonEmoji = (phase: 'first' | 'last'): string => {
  const isSouthern = isInSouthernHemisphere()
  if (phase === 'first') {
    return isSouthern ? '🌗' : '🌓' // Swap for Southern Hemisphere
  } else {
    return isSouthern ? '🌓' : '🌗' // Swap for Southern Hemisphere
  }
}

/**
 * Get hemisphere-aware crescent moon emojis
 * Crescents also appear flipped in the Southern Hemisphere
 */
const getCrescentMoonEmoji = (phase: 'waxing' | 'waning'): string => {
  const isSouthern = isInSouthernHemisphere()
  if (phase === 'waxing') {
    return isSouthern ? '🌘' : '🌒' // Swap for Southern Hemisphere
  } else {
    return isSouthern ? '🌒' : '🌘' // Swap for Southern Hemisphere
  }
}

/**
 * Get hemisphere-aware gibbous moon emojis
 * Gibbous phases also appear flipped in the Southern Hemisphere
 */
const getGibbousMoonEmoji = (phase: 'waxing' | 'waning'): string => {
  const isSouthern = isInSouthernHemisphere()
  if (phase === 'waxing') {
    return isSouthern ? '🌖' : '🌔' // Swap for Southern Hemisphere
  } else {
    return isSouthern ? '🌔' : '🌖' // Swap for Southern Hemisphere
  }
}

/**
 * Get the current lunar phase name and emoji
 */
const getCurrentLunarPhase = (date: Date = new Date()): { name: string; emoji: string } => {
  const age = getLunarAge(date)
  const phaseIndex = Math.floor((age / SYNODIC_MONTH) * 8) % 8
  
  // Use hemisphere-aware emojis for phases that appear different in each hemisphere
  const phases = [
    { name: "New Moon", emoji: "🌑" },
    { name: "Waxing Crescent", emoji: getCrescentMoonEmoji('waxing') },
    { name: "First Quarter", emoji: getQuarterMoonEmoji('first') },
    { name: "Waxing Gibbous", emoji: getGibbousMoonEmoji('waxing') },
    { name: "Full Moon", emoji: "🌕" },
    { name: "Waning Gibbous", emoji: getGibbousMoonEmoji('waning') },
    { name: "Last Quarter", emoji: getQuarterMoonEmoji('last') },
    { name: "Waning Crescent", emoji: getCrescentMoonEmoji('waning') },
  ]
  
  return phases[phaseIndex]
}

/**
 * Calculate the next occurrence of a specific lunar phase
 * @param targetPhase - Phase index (0 = New Moon, 2 = First Quarter, 4 = Full Moon, 6 = Last Quarter)
 * @param fromDate - Starting date
 */
const getNextLunarPhase = (targetPhase: number, fromDate: Date = new Date()): Date => {
  const currentAge = getLunarAge(fromDate)
  const targetAge = (targetPhase / 8) * SYNODIC_MONTH
  
  let daysUntilPhase = targetAge - currentAge
  if (daysUntilPhase <= 0) {
    daysUntilPhase += SYNODIC_MONTH
  }
  
  return addDays(fromDate, Math.round(daysUntilPhase))
}

/**
 * Get all upcoming lunar phases and abstract lunar concepts
 * Uses hemisphere-aware emojis for quarter phases
 */
const getLunarPhasePoints = (): TimePoint[] => {
  const now = new Date()
  const currentPhase = getCurrentLunarPhase(now)
  
  // Get hemisphere-aware emojis
  const firstQuarterEmoji = getQuarterMoonEmoji('first')
  const lastQuarterEmoji = getQuarterMoonEmoji('last')
  
  const phases: TimePoint[] = [
    // === ABSTRACT CONCEPTS (not tied to specific dates) ===
    // These represent the general class/concept of each lunar phase
    {
      id: 'lunar:abstract:new-moons',
      label: 'New Moons',
      date: new Date(0), // Epoch date to indicate abstract
      emoji: '🌑',
    },
    {
      id: 'lunar:abstract:first-quarters',
      label: 'First Quarters',
      date: new Date(0),
      emoji: firstQuarterEmoji, // Hemisphere-aware
    },
    {
      id: 'lunar:abstract:full-moons',
      label: 'Full Moons',
      date: new Date(0),
      emoji: '🌕',
    },
    {
      id: 'lunar:abstract:last-quarters',
      label: 'Last Quarters',
      date: new Date(0),
      emoji: lastQuarterEmoji, // Hemisphere-aware
    },
    
  ]
  
  // Sort: abstract concepts first, then by date for specific phases
  return phases.sort((a, b) => {
    const aIsAbstract = a.id.includes(':abstract:')
    const bIsAbstract = b.id.includes(':abstract:')
    if (aIsAbstract && !bIsAbstract) return -1
    if (!aIsAbstract && bIsAbstract) return 1
    return a.date.getTime() - b.date.getTime()
  })
}

// ============================================================================
// TimePoint Suggestions
// ============================================================================

// Time of day periods - using actual solar times where applicable
const getTimeOfDayPoints = (): TimePoint[] => {
  const solar = getSolarTimesForToday()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Morning: after sunrise
  const morning = new Date(solar.goldenHourEnd)
  morning.setMinutes(morning.getMinutes() + 60) // ~1 hour after golden hour ends
  
  // Afternoon: between solar noon and golden hour
  const afternoon = new Date(solar.solarNoon)
  afternoon.setMinutes(afternoon.getMinutes() + 120) // ~2 hours after solar noon
  
  // Evening: after sunset
  const evening = new Date(solar.sunset)
  evening.setMinutes(evening.getMinutes() + 60) // ~1 hour after sunset
  
  // Night: after civil dusk
  const night = new Date(solar.civilDusk)
  night.setMinutes(night.getMinutes() + 90) // ~1.5 hours after civil dusk
  
  return [
    { id: 'timepoint:dawn', label: `Dawn (${formatSolarTime(solar.civilDawn)})`, date: solar.civilDawn, emoji: '🌅' },
    { id: 'timepoint:morning', label: `Morning (${formatSolarTime(morning)})`, date: morning, emoji: '🌤️' },
    { id: 'timepoint:noon', label: `Noon (${formatSolarTime(solar.solarNoon)})`, date: solar.solarNoon, emoji: '☀️' },
    { id: 'timepoint:afternoon', label: `Afternoon (${formatSolarTime(afternoon)})`, date: afternoon, emoji: '🌞' },
    { id: 'timepoint:dusk', label: `Dusk (${formatSolarTime(solar.civilDusk)})`, date: solar.civilDusk, emoji: '🌆' },
    { id: 'timepoint:evening', label: `Evening (${formatSolarTime(evening)})`, date: evening, emoji: '🌇' },
    { id: 'timepoint:night', label: `Night (${formatSolarTime(night)})`, date: night, emoji: '🌙' },
  ]
}

// Solar time helpers - calculated based on actual location
const getSolarTimePoints = (): TimePoint[] => {
  const solar = getSolarTimesForToday()
  const location = cachedLocation || getStoredLocation()
  const locationLabel = location.locationName ? ` (${location.locationName})` : ''
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const midnight = new Date(today)
  midnight.setHours(0, 0, 0)
  
  return [
    { 
      id: 'timepoint:astronomical-dawn', 
      label: `Astronomical Dawn (${formatSolarTime(solar.astronomicalDawn)})`, 
      date: solar.astronomicalDawn, 
      emoji: '🌌' 
    },
    { 
      id: 'timepoint:nautical-dawn', 
      label: `Nautical Dawn (${formatSolarTime(solar.nauticalDawn)})`, 
      date: solar.nauticalDawn, 
      emoji: '🌊' 
    },
    { 
      id: 'timepoint:civil-dawn', 
      label: `Civil Dawn (${formatSolarTime(solar.civilDawn)})`, 
      date: solar.civilDawn, 
      emoji: '🌅' 
    },
    { 
      id: 'timepoint:sunrise', 
      label: `Sunrise (${formatSolarTime(solar.sunrise)})`, 
      date: solar.sunrise, 
      emoji: '🌄' 
    },
    { 
      id: 'timepoint:golden-hour-morning', 
      label: `Golden Hour End (${formatSolarTime(solar.goldenHourEnd)})`, 
      date: solar.goldenHourEnd, 
      emoji: '✨' 
    },
    { 
      id: 'timepoint:solar-noon', 
      label: `Local Solar Noon (${formatSolarTime(solar.solarNoon)})`, 
      date: solar.solarNoon, 
      emoji: '☀️' 
    },
    { 
      id: 'timepoint:golden-hour-evening', 
      label: `Golden Hour Start (${formatSolarTime(solar.goldenHourStart)})`, 
      date: solar.goldenHourStart, 
      emoji: '✨' 
    },
    { 
      id: 'timepoint:sunset', 
      label: `Sunset (${formatSolarTime(solar.sunset)})`, 
      date: solar.sunset, 
      emoji: '🌇' 
    },
    { 
      id: 'timepoint:civil-dusk', 
      label: `Civil Dusk (${formatSolarTime(solar.civilDusk)})`, 
      date: solar.civilDusk, 
      emoji: '🌆' 
    },
    { 
      id: 'timepoint:nautical-dusk', 
      label: `Nautical Dusk (${formatSolarTime(solar.nauticalDusk)})`, 
      date: solar.nauticalDusk, 
      emoji: '🌊' 
    },
    { 
      id: 'timepoint:astronomical-dusk', 
      label: `Astronomical Dusk (${formatSolarTime(solar.astronomicalDusk)})`, 
      date: solar.astronomicalDusk, 
      emoji: '🌌' 
    },
    { 
      id: 'timepoint:midnight', 
      label: 'Midnight', 
      date: midnight, 
      emoji: '🌙' 
    },
  ]
}

const getTimePoints = (): TimePoint[] => {
  const now = new Date()
  const nextSeason = getNextSeason()
  const seasonMarkers = getSeasonMarkersForUser()
  const seasonOrder = [
    seasonMarkers.find((season) => season.name === 'Spring')!,
    seasonMarkers.find((season) => season.name === 'Autumn')!,
    seasonMarkers.find((season) => season.name === 'Summer')!,
    seasonMarkers.find((season) => season.name === 'Winter')!,
  ]
  const nextSeasonIndex = seasonOrder.findIndex((season) => season.name === nextSeason.name)
  const orderedSeasons = nextSeasonIndex >= 0
    ? [...seasonOrder.slice(nextSeasonIndex), ...seasonOrder.slice(0, nextSeasonIndex)]
    : seasonOrder
  
  return [
    // Daily concept (not tied to a specific date)
    { id: 'timepoint:daily', label: 'Daily', date: new Date(0), emoji: '📆' },
    // Weekday concepts (ALL Mondays through Sundays, not tied to a specific date)
    { id: 'timepoint:weekday-monday', label: 'Mondays', date: new Date(0), emoji: '📅' },
    { id: 'timepoint:weekday-tuesday', label: 'Tuesdays', date: new Date(0), emoji: '📅' },
    { id: 'timepoint:weekday-wednesday', label: 'Wednesdays', date: new Date(0), emoji: '📅' },
    { id: 'timepoint:weekday-thursday', label: 'Thursdays', date: new Date(0), emoji: '📅' },
    { id: 'timepoint:weekday-friday', label: 'Fridays', date: new Date(0), emoji: '📅' },
    { id: 'timepoint:weekday-saturday', label: 'Saturdays', date: new Date(0), emoji: '📅' },
    { id: 'timepoint:weekday-sunday', label: 'Sundays', date: new Date(0), emoji: '📅' },
    // Abstract "Today" - not tied to a specific date, useful for templates
    { id: 'timepoint:today-abstract', label: "Today's abstract for templates", date: new Date(0), emoji: '📋' },
    { id: 'timepoint:today', label: "Today's date", date: now, emoji: '🗓️' },
    { id: 'timepoint:tomorrow', label: 'Tomorrow', date: addDays(now, 1), emoji: '🗓️' },
    { id: 'timepoint:yesterday', label: 'Yesterday', date: addDays(now, -1), emoji: '🗓️' },
    { id: 'timepoint:next-week', label: 'Next Week', date: addDays(now, 7), emoji: '📅' },
    { id: 'timepoint:next-month', label: 'Next Month', date: addDays(now, 30), emoji: '📅' },
    // Abstract season concepts (e.g., "Springs", "Summers") - not tied to a specific date
    ...orderedSeasons.map((season) => ({
      id: `timepoint:season-abstract-${season.name.toLowerCase()}`,
      label: `${season.name}s`,
      date: new Date(0), // Epoch date to indicate abstract
      emoji: season.emoji,
    })),
    // Abstract seasonal markers - not tied to a specific date
    { id: 'timepoint:season-marker-spring-equinox', label: 'Spring Equinox', date: new Date(0), emoji: '🌷' },
    { id: 'timepoint:season-marker-summer-solistice', label: 'Summer Solistice', date: new Date(0), emoji: '🌞' },
    { id: 'timepoint:season-marker-autumn-equinox', label: 'Autumn Equinox', date: new Date(0), emoji: '🍁' },
    { id: 'timepoint:season-marker-winter-solistice', label: 'Winter Solistice', date: new Date(0), emoji: '❄️' },
    // Lunar phase points (New Moon, Full Moon, First Quarter, etc.)
    ...getLunarPhasePoints(),
    // Time of day periods (Dawn, Morning, Noon, Afternoon, Dusk, Evening, Night)
    ...getTimeOfDayPoints(),
  ]
}

const isRecurringPeriodId = (id: string): boolean =>
  id === 'timepoint:daily' ||
  id.startsWith('timepoint:weekday-') ||
  id.startsWith('lunar:') ||
  id.startsWith('timepoint:season-abstract-') ||
  id.startsWith('timepoint:season-marker-')

const getTemporalLengthDays = (tp: TimePoint): number => {
  const id = tp.id
  // Architecture: normalize temporal length estimates so the dropdown
  // ordering stays consistent across mixed timepoint types.
  if (id === 'timepoint:daily') return 1
  if (id === 'timepoint:today-abstract') return 1
  if (id.startsWith('timepoint:weekday-')) return 7
  if (id === 'timepoint:next-week') return 7
  if (id === 'timepoint:next-month') return 30
  if (id.startsWith('timepoint:year-')) return 365
  if (id.startsWith('timepoint:month-')) return 30
  if (id.startsWith('timepoint:season-marker-')) return 90
  if (id.startsWith('timepoint:recurring-')) return 365
  if (id.startsWith('timepoint:date-')) return 1
  if (id.startsWith('timepoint:time-')) return 1 / 24
  if (id.startsWith('timepoint:season-abstract-')) return 90
  if (id.startsWith('lunar:abstract:')) return 29.5
  if (id.startsWith('lunar:')) return 1
  if (
    id.includes('dawn') ||
    id.includes('sunrise') ||
    id.includes('noon') ||
    id.includes('afternoon') ||
    id.includes('dusk') ||
    id.includes('evening') ||
    id.includes('night') ||
    id.includes('sunset') ||
    id.includes('golden-hour') ||
    id.includes('midnight')
  ) {
    return 1 / 24
  }
  return 1
}

// Architecture: order timepoints from shortest → longest duration so the list
// follows an intuitive temporal progression for scanning and selection.
const sortTimePointsByLength = (points: TimePoint[]): TimePoint[] => {
  return [...points].sort((a, b) => {
    const lengthDiff = getTemporalLengthDays(a) - getTemporalLengthDays(b)
    if (lengthDiff !== 0) return lengthDiff
    return a.label.localeCompare(b.label)
  })
}

const isValidYear = (str: string): boolean => {
  if (!/^\d{4}$/.test(str)) return false
  const year = parseInt(str, 10)
  return year >= 1900 && year <= 2200
}

const createYearTimePoint = (year: number): TimePoint => ({
  id: `timepoint:year-${year}`,
  label: `${year}`,
  date: new Date(year, 0, 1),
  emoji: '📆',
})

// ============================================================================
// Month Parsing Helpers
// ============================================================================

const MONTHS: { [key: string]: number } = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const parseMonthName = (str: string): number | null => {
  const lower = str.toLowerCase()
  return MONTHS[lower] ?? null
}

const createMonthYearTimePoint = (month: number, year: number): TimePoint => {
  const monthName = MONTH_NAMES[month]
  return {
    id: `timepoint:month-${year}-${month + 1}`,
    label: `${monthName} ${year}`,
    date: new Date(year, month, 1),
    emoji: '📅',
  }
}

const createMonthTimePoint = (month: number): TimePoint => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  // If the month is in the past this year, use next year
  const year = month < currentMonth ? currentYear + 1 : currentYear
  const monthName = MONTH_NAMES[month]
  
  return {
    id: `timepoint:month-${year}-${month + 1}`,
    label: `${monthName} ${year}`,
    date: new Date(year, month, 1),
    emoji: '📅',
  }
}

const getMonthYearSuggestions = (query: string): TimePoint[] => {
  const results: TimePoint[] = []
  const lowerQuery = query.toLowerCase().trim()
  
  // Try to parse "Month Year" format (e.g., "April 2026", "Apr 2026")
  const monthYearMatch = lowerQuery.match(/^([a-z]+)\s*(\d{2,4})?$/)
  if (monthYearMatch) {
    const [, monthStr, yearStr] = monthYearMatch
    const month = parseMonthName(monthStr)
    
    if (month !== null) {
      if (yearStr) {
        // Month + Year provided
        let year = parseInt(yearStr, 10)
        // Handle 2-digit years (e.g., "26" -> 2026)
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year
        }
        if (year >= 1900 && year <= 2200) {
          results.push(createMonthYearTimePoint(month, year))
          // Also suggest surrounding years
          if (year > 1900) results.push(createMonthYearTimePoint(month, year - 1))
          if (year < 2200) results.push(createMonthYearTimePoint(month, year + 1))
        }
      } else {
        // Only month provided - show next occurrence
        results.push(createMonthTimePoint(month))
        // Also suggest next few years
        const currentYear = new Date().getFullYear()
        for (let y = currentYear; y <= currentYear + 3; y++) {
          const tp = createMonthYearTimePoint(month, y)
          if (!results.find(r => r.id === tp.id)) {
            results.push(tp)
          }
        }
      }
      return results.slice(0, 6)
    }
  }
  
  // Partial month name matching (e.g., "Ap" -> April, "Au" -> August)
  const partialMatches = Object.keys(MONTHS)
    .filter(name => name.length > 3 && name.startsWith(lowerQuery)) // Only full month names
    .map(name => MONTHS[name])
    .filter((v, i, a) => a.indexOf(v) === i) // Unique months
  
  if (partialMatches.length > 0) {
    for (const month of partialMatches) {
      results.push(createMonthTimePoint(month))
    }
    return results.slice(0, 6)
  }
  
  return results
}

// ============================================================================
// Full Date Parsing (e.g., "6 August 2026", "August 6, 2026", "6 Aug 2026")
// ============================================================================

const createFullDateTimePoint = (day: number, month: number, year: number): TimePoint => {
  const date = new Date(year, month, day)
  const monthName = MONTH_NAMES[month]
  return {
    id: `timepoint:date-${year}-${month + 1}-${day}`,
    label: `${day} ${monthName} ${year}`,
    date,
    emoji: '📅',
  }
}

// Recurring date (e.g., "6 August" every year - not tied to a specific year)
const createRecurringDateTimePoint = (day: number, month: number): TimePoint => {
  const monthName = MONTH_NAMES[month]
  // Use epoch date (1970-01-01) as placeholder since it's not tied to a specific year
  const date = new Date(0)
  return {
    id: `timepoint:recurring-${month + 1}-${day}`,
    label: `${day} ${monthName}`,
    date,
    emoji: '🔄',
  }
}

const parseFullDate = (query: string): TimePoint | null => {
  const lowerQuery = query.toLowerCase().trim()
  
  // Pattern 1: "6 August 2026", "6 Aug 2026", "6 August", "6 Aug"
  // Day Month [Year]
  const dayMonthYearMatch = lowerQuery.match(/^(\d{1,2})\s+([a-z]+)\s*(\d{2,4})?$/)
  if (dayMonthYearMatch) {
    const [, dayStr, monthStr, yearStr] = dayMonthYearMatch
    const day = parseInt(dayStr, 10)
    const month = parseMonthName(monthStr)
    
    if (month !== null && day >= 1 && day <= 31) {
      let year: number
      if (yearStr) {
        year = parseInt(yearStr, 10)
        // Handle 2-digit years
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year
        }
      } else {
        // No year provided - use current or next year
        const now = new Date()
        const currentYear = now.getFullYear()
        const testDate = new Date(currentYear, month, day)
        year = testDate < now ? currentYear + 1 : currentYear
      }
      
      if (year >= 1900 && year <= 2200) {
        // Validate the day is valid for this month
        const testDate = new Date(year, month, day)
        if (testDate.getMonth() === month && testDate.getDate() === day) {
          return createFullDateTimePoint(day, month, year)
        }
      }
    }
  }
  
  // Pattern 2: "August 6, 2026", "Aug 6, 2026", "August 6 2026", "August 6"
  // Month Day[,] [Year]
  const monthDayYearMatch = lowerQuery.match(/^([a-z]+)\s+(\d{1,2}),?\s*(\d{2,4})?$/)
  if (monthDayYearMatch) {
    const [, monthStr, dayStr, yearStr] = monthDayYearMatch
    const day = parseInt(dayStr, 10)
    const month = parseMonthName(monthStr)
    
    if (month !== null && day >= 1 && day <= 31) {
      let year: number
      if (yearStr) {
        year = parseInt(yearStr, 10)
        // Handle 2-digit years
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year
        }
      } else {
        // No year provided - use current or next year
        const now = new Date()
        const currentYear = now.getFullYear()
        const testDate = new Date(currentYear, month, day)
        year = testDate < now ? currentYear + 1 : currentYear
      }
      
      if (year >= 1900 && year <= 2200) {
        // Validate the day is valid for this month
        const testDate = new Date(year, month, day)
        if (testDate.getMonth() === month && testDate.getDate() === day) {
          return createFullDateTimePoint(day, month, year)
        }
      }
    }
  }
  
  return null
}

const getFullDateSuggestions = (query: string): TimePoint[] => {
  const results: TimePoint[] = []
  const lowerQuery = query.toLowerCase().trim()
  
  // Check if query has a year (for determining if we should offer recurring option)
  const hasYear = /\d{4}/.test(query) || /\d{2}$/.test(query.replace(/\d{1,2}\s+[a-z]+\s*/i, ''))
  
  const parsed = parseFullDate(query)
  
  if (parsed) {
    const date = parsed.date
    const day = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear()
    
    // If no year was provided in the query, offer recurring date as first option
    if (!hasYear) {
      results.push(createRecurringDateTimePoint(day, month))
    }
    
    // Add the specific year date
    results.push(parsed)
    
    // Also suggest same date in surrounding years
    // Suggest next year and previous year (if valid)
    if (year > 1900) {
      const prevYearDate = new Date(year - 1, month, day)
      if (prevYearDate.getMonth() === month && prevYearDate.getDate() === day) {
        results.push(createFullDateTimePoint(day, month, year - 1))
      }
    }
    if (year < 2200) {
      const nextYearDate = new Date(year + 1, month, day)
      if (nextYearDate.getMonth() === month && nextYearDate.getDate() === day) {
        results.push(createFullDateTimePoint(day, month, year + 1))
      }
    }
  }
  
  return results.slice(0, 6)
}

const getYearSuggestions = (query: string): TimePoint[] => {
  const results: TimePoint[] = []
  const currentYear = new Date().getFullYear()
  
  if (query.length === 4 && isValidYear(query)) {
    return [createYearTimePoint(parseInt(query, 10))]
  }
  
  if (query.length === 3 && /^\d{3}$/.test(query)) {
    const base = parseInt(query, 10) * 10
    for (let i = 0; i <= 9; i++) {
      const year = base + i
      if (year >= 1900 && year <= 2200) results.push(createYearTimePoint(year))
    }
    return results.slice(0, 6)
  }
  
  if (query.length === 2 && /^\d{2}$/.test(query)) {
    const prefix = parseInt(query, 10)
    // Century prefixes (19, 20, 21, 22) - show years in that century
    if (prefix >= 19 && prefix <= 22) {
      const centuryStart = prefix * 100
      // For current century (20xx), show years around current year
      if (prefix === 20) {
        for (let y = currentYear - 2; y <= currentYear + 10; y++) {
          if (y.toString().startsWith(query)) results.push(createYearTimePoint(y))
        }
      } 
      // For 21xx century
      else if (prefix === 21) {
        for (let y = 2100; y <= 2110; y++) {
          results.push(createYearTimePoint(y))
        }
      }
      // For 22xx century (up to 2200)
      else if (prefix === 22) {
        results.push(createYearTimePoint(2200))
      }
      // For 19xx
      else if (prefix === 19) {
        for (let y = 1990; y <= 1999; y++) {
          results.push(createYearTimePoint(y))
        }
      }
    } else {
      // 2-digit year shorthand (e.g., "24" -> 2024, "90" -> 2090)
      const fullYear = 2000 + prefix
      if (fullYear >= 2000 && fullYear <= 2200) results.push(createYearTimePoint(fullYear))
    }
    return results.slice(0, 6)
  }
  
  if (query.length === 1 && /^\d$/.test(query)) {
    for (let y = currentYear; y <= currentYear + 5; y++) results.push(createYearTimePoint(y))
    return results.slice(0, 6)
  }
  
  return results
}

// Parse arbitrary time strings like "8:00am", "3pm", "14:30", "8am", "8:00 am", "7.30pm", "730pm"
const parseTimeString = (query: string): TimePoint | null => {
  const lowerQuery = query.toLowerCase().trim()
  
  let hour: number
  let minute: number
  let period: string | undefined
  
  // Pattern 1: With separator - "8am", "8:00am", "8:00 am", "8 am", "14:30", "2:30pm", "7.30pm", "7.30"
  const separatorMatch = lowerQuery.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/)
  
  // Pattern 2: Without separator - "730pm", "1130am", "700pm", "730", "1430"
  // This pattern handles 3-4 digit times where the last 2 digits are minutes
  const noSeparatorMatch = lowerQuery.match(/^(\d{1,2})(\d{2})\s*(am|pm)?$/)
  
  if (separatorMatch) {
    const [, hourStr, minuteStr, periodStr] = separatorMatch
    hour = parseInt(hourStr, 10)
    minute = minuteStr ? parseInt(minuteStr, 10) : 0
    period = periodStr
  } else if (noSeparatorMatch) {
    // Parse formats like "730pm" where "7" is hour and "30" is minutes
    const [, hourStr, minuteStr, periodStr] = noSeparatorMatch
    hour = parseInt(hourStr, 10)
    minute = parseInt(minuteStr, 10)
    period = periodStr
  } else {
    return null
  }
  
  // Validate hour and minute
  if (minute < 0 || minute > 59) return null
  
  // Handle 12-hour format
  if (period) {
    if (hour < 1 || hour > 12) return null
    if (period === 'pm' && hour !== 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
  } else {
    // 24-hour format
    if (hour < 0 || hour > 23) return null
  }
  
  const now = new Date()
  const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0)
  
  // Format the label nicely
  const formattedTime = timeDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: minute > 0 ? '2-digit' : undefined,
    hour12: true 
  })
  
  return {
    id: `timepoint:time-${hour}-${minute}`,
    label: formattedTime,
    date: timeDate,
    emoji: '🕐',
  }
}

const isCustomTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:time-')

const fetchTimePoints = (query: string): TimePoint[] => {
  const timePoints = getTimePoints()
  console.log('[TimePoint] fetchTimePoints called with query:', JSON.stringify(query))
  if (!query) return sortTimePointsByLength(timePoints)
  
  const lowerQuery = query.toLowerCase()
  // Architecture: When a query is provided, we must filter recurring and specific time items
  // to only include those matching the query. Previously, these were always included unfiltered,
  // which caused the search functionality to appear broken - matching items would be buried
  // under non-matching recurring/time items, preventing the auto-select of the first match.
  const recurringItems = timePoints.filter((tp) => 
    isRecurringPeriodId(tp.id) && tp.label.toLowerCase().includes(lowerQuery)
  )
  // Keep specific time-based entries visible only when they match the query.
  const specificTimeItems = timePoints.filter(
    (tp) => (isTimeOfDayPoint(tp) || isSolarTimePoint(tp) || isTimeTimePoint(tp)) &&
            tp.label.toLowerCase().includes(lowerQuery)
  )
  let results: TimePoint[] = []
  
  // Try parsing as arbitrary time (e.g., "8:00am", "3pm", "14:30")
  const timePoint = parseTimeString(query)
  if (timePoint) {
    console.log('[TimePoint] Matched time string:', timePoint)
    results = [timePoint]
  } else {
    // Special handling for lunar-related queries
    const lunarKeywords = ['moon', 'lunar', 'full', 'new', 'quarter', 'crescent', 'gibbous', 'waxing', 'waning', 'phase']
    const isLunarQuery = lunarKeywords.some(keyword => lowerQuery.includes(keyword))
    if (isLunarQuery) {
      results = timePoints.filter((tp) => tp.id.startsWith('lunar:') || tp.label.toLowerCase().includes(lowerQuery))
    } else {
      // Pure numeric query - could be year or time
      if (/^\d+$/.test(query)) {
        // If it looks like a time (1-12 or 0-23), offer both interpretations
        const num = parseInt(query, 10)
        if (num >= 1 && num <= 12) {
          // Could be hour - show AM/PM options
          const amTime = parseTimeString(`${num}am`)
          const pmTime = parseTimeString(`${num}pm`)
          const timeResults: TimePoint[] = []
          if (amTime) timeResults.push(amTime)
          if (pmTime) timeResults.push(pmTime)
          // Also check year suggestions
          const yearSuggestions = getYearSuggestions(query)
          results = [...timeResults, ...yearSuggestions].slice(0, 6)
        } else {
          const yearSuggestions = getYearSuggestions(query)
          if (yearSuggestions.length > 0) results = yearSuggestions
        }
      }
      
      if (results.length === 0) {
        // Try full date parsing (e.g., "6 August 2026", "August 6, 2026", "6 Aug")
        console.log('[TimePoint] Trying full date parsing for:', query)
        const fullDateSuggestions = getFullDateSuggestions(query)
        console.log('[TimePoint] Full date suggestions:', fullDateSuggestions)
        if (fullDateSuggestions.length > 0) {
          results = fullDateSuggestions
        } else if (/^[a-zA-Z]/.test(query)) {
          // Try month/month+year parsing (e.g., "April", "April 2026", "Apr 26")
          const monthYearSuggestions = getMonthYearSuggestions(query)
          if (monthYearSuggestions.length > 0) results = monthYearSuggestions
        }
      }
      
      // Fall back to filtering built-in timepoints (includes lunar phases)
      if (results.length === 0) {
        results = timePoints.filter((tp) => tp.label.toLowerCase().includes(lowerQuery))
      }
    }
  }

  const merged = [...recurringItems, ...specificTimeItems, ...results]
  const uniqueById = new Map(merged.map((item) => [item.id, item]))
  return sortTimePointsByLength(Array.from(uniqueById.values()))
}

// ============================================================================
// TimePoint List Component (Dropdown UI)
// ============================================================================

const isYearTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:year-')
const isMonthTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:month-')
const isFullDateTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:date-')
const isRecurringDatePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:recurring-')
const isAbstractTimePoint = (tp: TimePoint): boolean =>
  tp.id === 'timepoint:today-abstract' || tp.id === 'timepoint:daily'
const isAbstractLunarPhase = (tp: TimePoint): boolean => tp.id.startsWith('lunar:abstract:')
const isAbstractSeasonPoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:season-abstract-')
const isTimeOfDayPoint = (tp: TimePoint): boolean => {
  const timeOfDayIds = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night']
  return timeOfDayIds.some(id => tp.id === `timepoint:${id}`)
}
const isSolarTimePoint = (tp: TimePoint): boolean => {
  const solarIds = ['sunrise', 'golden-hour', 'solar-noon', 'sunset', 'blue-hour', 'midnight']
  return solarIds.some(id => tp.id.includes(id))
}
const isTimeTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:time-')
const isLunarPhasePoint = (tp: TimePoint): boolean => tp.id.startsWith('lunar:')
const isRecurringPeriodTimePoint = (tp: TimePoint): boolean =>
  isRecurringPeriodId(tp.id)
const isWeekdayTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:weekday-')

const getWeekdayRecurringLabel = (tp: TimePoint): string => {
  if (!isWeekdayTimePoint(tp)) return ''
  const dayName = tp.label.replace(/s$/, '')
  return `For events that are intended to happen every ${dayName}`
}

const getRecurringTimePeriodLabel = (tp: TimePoint): string => {
  if (tp.id === 'timepoint:daily') return 'day'
  if (isWeekdayTimePoint(tp)) return tp.label.replace(/s$/, '')
  if (tp.id.startsWith('lunar:abstract:')) return tp.label.replace(/s$/, '')
  if (tp.id.startsWith('timepoint:season-abstract-')) return tp.label.replace(/s$/, '')
  if (tp.id.startsWith('timepoint:season-marker-')) return tp.label
  return tp.label
}

const getSpecificTimeSortKey = (tp: TimePoint): number | null => {
  if (isTimeOfDayPoint(tp) || isSolarTimePoint(tp) || isTimeTimePoint(tp)) {
    return tp.date.getTime()
  }
  return null
}

const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const formatWeekdayShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

const getNextWeekdayDate = (weekdayIndex: number): Date => {
  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const currentDay = base.getDay()
  let delta = (weekdayIndex - currentDay + 7) % 7
  if (delta === 0) delta = 7
  base.setDate(base.getDate() + delta)
  return base
}

const getNextSeasonMarkerDate = (seasonName: string): Date | null => {
  const seasonMarkers = getSeasonMarkersForUser()
  const season = seasonMarkers.find((marker) => marker.name === seasonName)
  if (!season) return null
  const today = new Date()
  const year = today.getFullYear()
  const candidate = new Date(year, season.month, season.day)
  if (candidate <= today) {
    return new Date(year + 1, season.month, season.day)
  }
  return candidate
}

const getNextRecurringDateLabel = (tp: TimePoint): string | null => {
  if (tp.id === 'timepoint:daily') {
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + 1)
    return `Next ${formatWeekdayShortDate(nextDay)}`
  }
  if (tp.id.startsWith('timepoint:weekday-')) {
    const weekdayMap: Record<string, number> = {
      'timepoint:weekday-sunday': 0,
      'timepoint:weekday-monday': 1,
      'timepoint:weekday-tuesday': 2,
      'timepoint:weekday-wednesday': 3,
      'timepoint:weekday-thursday': 4,
      'timepoint:weekday-friday': 5,
      'timepoint:weekday-saturday': 6,
    }
    const targetDay = weekdayMap[tp.id]
    if (targetDay === undefined) return null
    return `Next ${formatWeekdayShortDate(getNextWeekdayDate(targetDay))}`
  }
  if (tp.id.startsWith('timepoint:season-abstract-')) {
    const seasonName = tp.label.replace(/s$/, '')
    const nextDate = getNextSeasonMarkerDate(seasonName)
    if (!nextDate) return null
    return `Next ${seasonName}, ${formatShortDate(nextDate)}`
  }
  if (tp.id.startsWith('timepoint:season-marker-')) {
    const markerMap: Record<string, { seasonName: string; label: string }> = {
      'timepoint:season-marker-spring-equinox': { seasonName: 'Spring', label: 'Spring Equinox' },
      'timepoint:season-marker-summer-solistice': { seasonName: 'Summer', label: 'Summer Solistice' },
      'timepoint:season-marker-autumn-equinox': { seasonName: 'Autumn', label: 'Autumn Equinox' },
      'timepoint:season-marker-winter-solistice': { seasonName: 'Winter', label: 'Winter Solistice' },
    }
    const marker = markerMap[tp.id]
    if (!marker) return null
    const nextDate = getNextSeasonMarkerDate(marker.seasonName)
    if (!nextDate) return null
    return `Next ${marker.label}, ${formatShortDate(nextDate)}`
  }
  if (tp.id.startsWith('lunar:abstract:')) {
    const phaseMap: Record<string, { index: number; label: string }> = {
      'lunar:abstract:new-moons': { index: 0, label: 'New Moon' },
      'lunar:abstract:first-quarters': { index: 2, label: 'First Quarter' },
      'lunar:abstract:full-moons': { index: 4, label: 'Full Moon' },
      'lunar:abstract:last-quarters': { index: 6, label: 'Last Quarter' },
    }
    const phase = phaseMap[tp.id]
    if (!phase) return null
    const nextDate = getNextLunarPhase(phase.index, new Date())
    return `Next ${phase.label}, ${formatShortDate(nextDate)}`
  }
  return null
}

const WEEKDAY_SORT_ORDER: Record<string, number> = {
  'timepoint:weekday-monday': 1,
  'timepoint:weekday-tuesday': 2,
  'timepoint:weekday-wednesday': 3,
  'timepoint:weekday-thursday': 4,
  'timepoint:weekday-friday': 5,
  'timepoint:weekday-saturday': 6,
  'timepoint:weekday-sunday': 7,
}

// Spec: seasons must follow natural UI order: Spring → Summer → Autumn → Winter.
const SEASON_UI_ORDER: Record<string, number> = {
  spring: 1,
  summer: 2,
  autumn: 3,
  winter: 4,
}

// Spec: lunar phases must start at New Moon in the UI order.
const LUNAR_UI_ORDER: Record<string, number> = {
  'lunar:abstract:new-moons': 1,
  'lunar:abstract:first-quarters': 2,
  'lunar:abstract:full-moons': 3,
  'lunar:abstract:last-quarters': 4,
}

const getRecurringPeriodSortKey = (tp: TimePoint): number => {
  // Spec: lunar periods must appear before seasons in the recurring list
  // because lunar cycles are shorter than seasonal periods.
  if (tp.id === 'timepoint:daily') return 0
  if (tp.id.startsWith('timepoint:weekday-')) return 10 + (WEEKDAY_SORT_ORDER[tp.id] ?? 0)
  if (tp.id.startsWith('lunar:')) return 20 + (LUNAR_UI_ORDER[tp.id] ?? 0)
  if (tp.id.startsWith('timepoint:season-abstract-')) {
    const season = tp.id.replace('timepoint:season-abstract-', '')
    return 30 + (SEASON_UI_ORDER[season] ?? 0)
  }
  if (tp.id.startsWith('timepoint:season-marker-')) {
    const season = tp.id.replace('timepoint:season-marker-', '').split('-')[0]
    return 40 + (SEASON_UI_ORDER[season] ?? 0)
  }
  return 99
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const formatTimePointLabel = (tp: TimePoint): string => {
  if (isAbstractTimePoint(tp)) {
    return tp.id === 'timepoint:daily' ? `${tp.emoji} Daily` : `${tp.emoji} Today`
  }
  // Architecture: weekday timepoints are recurring concepts, not concrete dates.
  if (isWeekdayTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isAbstractLunarPhase(tp)) return `${tp.emoji} ${tp.label}` // General concept, no date
  if (isAbstractSeasonPoint(tp)) return `${tp.emoji} ${tp.label}` // General concept, no date
  if (isRecurringDatePoint(tp)) return `${tp.emoji} ${tp.label} (every year)` // Recurring date
  if (isYearTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isMonthTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isFullDateTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isTimeOfDayPoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isSolarTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isTimeTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isLunarPhasePoint(tp)) return `${tp.emoji} ${tp.label} (${formatDate(tp.date)})`
  return `${tp.emoji} ${formatDate(tp.date)}`
}

const TimePointList = forwardRef<TimePointListRef, TimePointListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const recurringPeriodItems = sortTimePointsByLength(
    props.items.filter(isRecurringPeriodTimePoint)
  ).sort((a, b) => {
    const keyDiff = getRecurringPeriodSortKey(a) - getRecurringPeriodSortKey(b)
    if (keyDiff !== 0) return keyDiff
    return getTemporalLengthDays(a) - getTemporalLengthDays(b)
  })
  const otherItems = sortTimePointsByLength(
    props.items.filter((item) => !isRecurringPeriodTimePoint(item))
  ).sort((a, b) => {
    const aKey = getSpecificTimeSortKey(a)
    const bKey = getSpecificTimeSortKey(b)
    if (aKey !== null && bKey !== null) return aKey - bKey
    if (aKey !== null) return -1
    if (bKey !== null) return 1
    return getTemporalLengthDays(a) - getTemporalLengthDays(b)
  })
  const orderedItems = [...recurringPeriodItems, ...otherItems]

  const selectItem = (index: number) => {
    if (orderedItems.length === 0 || index >= orderedItems.length) return

    const timePoint = orderedItems[index]
    let formattedDate: string
    const isWeekdayRecurring = isWeekdayTimePoint(timePoint)
    // Architecture: recurring weekday tags should not serialize an epoch date.
    const isAbstract = isAbstractTimePoint(timePoint) || isAbstractLunarPhase(timePoint) || isAbstractSeasonPoint(timePoint) || isRecurringDatePoint(timePoint) || isWeekdayRecurring
    
    if (isAbstractTimePoint(timePoint)) {
      if (timePoint.id === 'timepoint:daily') {
        formattedDate = 'Daily'
      } else {
      formattedDate = 'Today'
      }
    } else if (isWeekdayRecurring) {
      formattedDate = timePoint.label
    } else if (isAbstractLunarPhase(timePoint) || isAbstractSeasonPoint(timePoint)) {
      formattedDate = timePoint.label // Just the concept name, no date
    } else if (isRecurringDatePoint(timePoint)) {
      formattedDate = `${timePoint.label} (every year)` // Recurring date, no specific year
    } else if (isYearTimePoint(timePoint) || isMonthTimePoint(timePoint) || isFullDateTimePoint(timePoint)) {
      formattedDate = timePoint.label
    } else if (isTimeOfDayPoint(timePoint)) {
      formattedDate = `${timePoint.label} (~${formatTime(timePoint.date)})`
    } else if (isSolarTimePoint(timePoint)) {
      formattedDate = `${timePoint.label} (~${formatTime(timePoint.date)})`
    } else if (isTimeTimePoint(timePoint)) {
      formattedDate = timePoint.label
    } else if (isLunarPhasePoint(timePoint)) {
      formattedDate = `${timePoint.label} (${formatDate(timePoint.date)})`
    } else {
      formattedDate = formatDate(timePoint.date)
    }
    const displayLabel = formatTimePointLabel(timePoint)

    props.command({
      id: timePoint.id,
      label: displayLabel,
      'data-date': isAbstract ? '' : timePoint.date.toISOString(),
      'data-formatted': formattedDate,
      'data-relative-label': isAbstract ? timePoint.label : timePoint.label,
    })
  }

  const upHandler = () => {
    if (orderedItems.length === 0) return
    setSelectedIndex((selectedIndex + orderedItems.length - 1) % orderedItems.length)
  }
  const downHandler = () => {
    if (orderedItems.length === 0) return
    setSelectedIndex((selectedIndex + 1) % orderedItems.length)
  }
  const enterHandler = () => selectItem(selectedIndex)

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    },
  }))

  return (
    <div className="timepoint-items">
      {orderedItems.length > 0 ? (
        <>
          {recurringPeriodItems.length > 0 && (
            <>
              <div className="timepoint-section-label">Reoccuring events</div>
              {recurringPeriodItems.map((item: TimePoint, index) => {
                const absoluteIndex = index
                const recurringPeriodLabel = getRecurringTimePeriodLabel(item)
                const nextOccurrenceLabel = getNextRecurringDateLabel(item)
                return (
                  <motion.div
                    className={`timepoint-item ${absoluteIndex === selectedIndex ? 'is-selected' : ''}`}
                    key={item.id}
                    onClick={() => selectItem(absoluteIndex)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="timepoint-emoji">{item.emoji}</span>
                    <div className="timepoint-content">
                      <span className="timepoint-label">{item.label}</span>
                      <span className="timepoint-date">
                        For events that are intended to happen every {recurringPeriodLabel}
                        {nextOccurrenceLabel ? ` (${nextOccurrenceLabel})` : ''}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </>
          )}
          {otherItems.length > 0 && (
            <>
              {/* Timepoints section label shown as "Specific times" in UI. */}
              <div className="timepoint-section-label">Specific times</div>
              {otherItems.map((item: TimePoint, index) => {
                const absoluteIndex = index + recurringPeriodItems.length
                return (
                  <motion.div
                    className={`timepoint-item ${absoluteIndex === selectedIndex ? 'is-selected' : ''}`}
                    key={item.id}
                    onClick={() => selectItem(absoluteIndex)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="timepoint-emoji">{item.emoji}</span>
                    <div className="timepoint-content">
                      <span className="timepoint-label">{item.label}</span>
                      {isAbstractTimePoint(item) ? (
                        <span className="timepoint-date">
                          {item.id === 'timepoint:daily'
                            ? 'For events that are intended to happen every single day'
                            : 'Not tied to a specific date'}
                        </span>
                      ) : isAbstractLunarPhase(item) || isAbstractSeasonPoint(item) ? (
                        <span className="timepoint-date">
                          Every so and so, events will reoccur during this period
                        </span>
                      ) : isRecurringDatePoint(item) ? (
                        <span className="timepoint-date">Recurring every year</span>
                      ) : isYearTimePoint(item) ? (
                        <span className="timepoint-date">January 1st, {item.label}</span>
                      ) : isMonthTimePoint(item) ? (
                        <span className="timepoint-date">1st {item.label}</span>
                      ) : isFullDateTimePoint(item) ? (
                        <span className="timepoint-date">{formatDateWithDay(item.date)}</span>
                      ) : isTimeOfDayPoint(item) ? (
                        <span className="timepoint-date">~{formatTime(item.date)} today</span>
                      ) : isSolarTimePoint(item) ? (
                        <span className="timepoint-date">~{formatTime(item.date)} today</span>
                      ) : isWeekdayTimePoint(item) ? (
                        <span className="timepoint-date">{getWeekdayRecurringLabel(item)}</span>
                      ) : isTimeTimePoint(item) ? (
                        <span className="timepoint-date">Today at {item.label}</span>
                      ) : isLunarPhasePoint(item) ? (
                        <span className="timepoint-date">{formatDateWithDay(item.date)}</span>
                      ) : (
                        <span className="timepoint-date">{formatDateWithDay(item.date)}</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </>
          )}
        </>
      ) : (
        <div className="timepoint-item">No matching dates.</div>
      )}
    </div>
  )
})

TimePointList.displayName = 'TimePointList'

// ============================================================================
// TimePoint Node (for rendering inserted timepoints)
// ============================================================================

export const TimePointNode = Node.create({
  name: 'timepoint',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      'data-date': { default: null },
      'data-formatted': { default: null },
      'data-relative-label': { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="timepoint"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'timepoint-mention',
        'data-type': 'timepoint',
        'data-id': node.attrs.id,
      }),
      node.attrs.label || '',
    ]
  },
})

// ============================================================================
// TimePoint Extension (combines Node + Suggestion)
// ============================================================================

export interface TimePointOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<TimePoint>, 'editor'>
}

export const TemporalFieldExtension = Extension.create<TimePointOptions>({
  name: 'timepoint-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'timepoint-mention' },
      suggestion: {
        char: '@',
        allowSpaces: true, // Allow spaces for dates like "6 August 2026"
        pluginKey: TimePointPluginKey,
        items: ({ query }) => fetchTimePoints(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the timepoint node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'timepoint',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<TimePointListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(TimePointList, {
                props,
                editor: props.editor,
              })

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })[0]
            },

            onUpdate(props) {
              component?.updateProps(props)
              popup?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit() {
              popup?.destroy()
              component?.destroy()
              popup = undefined
              component = undefined
            },
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export default TemporalFieldExtension
