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

const getNextSeason = (): { name: string; date: Date; emoji: string } => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  if (month < 2 || (month === 2 && now.getDate() < 20)) {
    return { name: 'Spring', date: new Date(year, 2, 20), emoji: '🌸' }
  } else if (month < 5 || (month === 5 && now.getDate() < 21)) {
    return { name: 'Summer', date: new Date(year, 5, 21), emoji: '☀️' }
  } else if (month < 8 || (month === 8 && now.getDate() < 22)) {
    return { name: 'Autumn', date: new Date(year, 8, 22), emoji: '🍂' }
  } else if (month < 11 || (month === 11 && now.getDate() < 21)) {
    return { name: 'Winter', date: new Date(year, 11, 21), emoji: '❄️' }
  } else {
    return { name: 'Spring', date: new Date(year + 1, 2, 20), emoji: '🌸' }
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
 * Get the current lunar phase name and emoji
 */
const getCurrentLunarPhase = (date: Date = new Date()): { name: string; emoji: string } => {
  const age = getLunarAge(date)
  const phaseIndex = Math.floor((age / SYNODIC_MONTH) * 8) % 8
  
  const phases = [
    { name: "New Moon", emoji: "🌑" },
    { name: "Waxing Crescent", emoji: "🌒" },
    { name: "First Quarter", emoji: "🌓" },
    { name: "Waxing Gibbous", emoji: "🌔" },
    { name: "Full Moon", emoji: "🌕" },
    { name: "Waning Gibbous", emoji: "🌖" },
    { name: "Last Quarter", emoji: "🌗" },
    { name: "Waning Crescent", emoji: "🌘" },
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
 * Get all upcoming lunar phases
 */
const getLunarPhasePoints = (): TimePoint[] => {
  const now = new Date()
  const currentPhase = getCurrentLunarPhase(now)
  
  const phases: TimePoint[] = [
    // Current phase (today)
    {
      id: 'lunar:current',
      label: `Current Phase: ${currentPhase.name}`,
      date: now,
      emoji: currentPhase.emoji,
    },
    // Next New Moon
    {
      id: 'lunar:new-moon',
      label: 'New Moon',
      date: getNextLunarPhase(0, now),
      emoji: '🌑',
    },
    // Next First Quarter
    {
      id: 'lunar:first-quarter',
      label: 'First Quarter',
      date: getNextLunarPhase(2, now),
      emoji: '🌓',
    },
    // Next Full Moon
    {
      id: 'lunar:full-moon',
      label: 'Full Moon',
      date: getNextLunarPhase(4, now),
      emoji: '🌕',
    },
    // Next Last Quarter
    {
      id: 'lunar:last-quarter',
      label: 'Last Quarter',
      date: getNextLunarPhase(6, now),
      emoji: '🌗',
    },
  ]
  
  // Sort by date (nearest first)
  return phases.sort((a, b) => a.date.getTime() - b.date.getTime())
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
  
  return [
    // Abstract "Today" - not tied to a specific date, useful for templates
    { id: 'timepoint:today-abstract', label: "Today's abstract for templates", date: new Date(0), emoji: '📋' },
    { id: 'timepoint:today', label: "Today's date", date: now, emoji: '🗓️' },
    { id: 'timepoint:tomorrow', label: 'Tomorrow', date: addDays(now, 1), emoji: '🗓️' },
    { id: 'timepoint:yesterday', label: 'Yesterday', date: addDays(now, -1), emoji: '🗓️' },
    { id: 'timepoint:next-week', label: 'Next Week', date: addDays(now, 7), emoji: '📅' },
    { id: 'timepoint:next-month', label: 'Next Month', date: addDays(now, 30), emoji: '📅' },
    {
      id: `timepoint:next-season-${nextSeason.name.toLowerCase()}`,
      label: `Next Season (${nextSeason.name})`,
      date: nextSeason.date,
      emoji: nextSeason.emoji,
    },
    // Lunar phase points (New Moon, Full Moon, First Quarter, etc.)
    ...getLunarPhasePoints(),
    // Time of day periods (Dawn, Morning, Noon, Afternoon, Dusk, Evening, Night)
    ...getTimeOfDayPoints(),
    // Solar time points (Sunrise, Sunset, Golden Hour, etc.)
    ...getSolarTimePoints(),
  ]
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

// Parse arbitrary time strings like "8:00am", "3pm", "14:30", "8am", "8:00 am", "7.30pm"
const parseTimeString = (query: string): TimePoint | null => {
  const lowerQuery = query.toLowerCase().trim()
  
  // Match patterns: "8am", "8:00am", "8:00 am", "8 am", "14:30", "2:30pm", "7.30pm", "7.30"
  const timeMatch = lowerQuery.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/)
  if (!timeMatch) return null
  
  let [, hourStr, minuteStr, period] = timeMatch
  let hour = parseInt(hourStr, 10)
  const minute = minuteStr ? parseInt(minuteStr, 10) : 0
  
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
  if (!query) return timePoints
  
  const lowerQuery = query.toLowerCase()
  
  // Try parsing as arbitrary time (e.g., "8:00am", "3pm", "14:30")
  const timePoint = parseTimeString(query)
  if (timePoint) {
    return [timePoint]
  }
  
  // Special handling for lunar-related queries
  const lunarKeywords = ['moon', 'lunar', 'full', 'new', 'quarter', 'crescent', 'gibbous', 'waxing', 'waning', 'phase']
  const isLunarQuery = lunarKeywords.some(keyword => lowerQuery.includes(keyword))
  if (isLunarQuery) {
    return timePoints.filter((tp) => tp.id.startsWith('lunar:') || tp.label.toLowerCase().includes(lowerQuery))
  }
  
  // Pure numeric query - could be year or time
  if (/^\d+$/.test(query)) {
    // If it looks like a time (1-12 or 0-23), offer both interpretations
    const num = parseInt(query, 10)
    if (num >= 1 && num <= 12) {
      // Could be hour - show AM/PM options
      const amTime = parseTimeString(`${num}am`)
      const pmTime = parseTimeString(`${num}pm`)
      const results: TimePoint[] = []
      if (amTime) results.push(amTime)
      if (pmTime) results.push(pmTime)
      // Also check year suggestions
      const yearSuggestions = getYearSuggestions(query)
      return [...results, ...yearSuggestions].slice(0, 6)
    }
    
    const yearSuggestions = getYearSuggestions(query)
    if (yearSuggestions.length > 0) return yearSuggestions
  }
  
  // Try month/month+year parsing (e.g., "April", "April 2026", "Apr 26")
  if (/^[a-zA-Z]/.test(query)) {
    const monthYearSuggestions = getMonthYearSuggestions(query)
    if (monthYearSuggestions.length > 0) return monthYearSuggestions
  }
  
  // Fall back to filtering built-in timepoints (includes lunar phases)
  return timePoints.filter((tp) => tp.label.toLowerCase().includes(lowerQuery))
}

// ============================================================================
// TimePoint List Component (Dropdown UI)
// ============================================================================

const isYearTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:year-')
const isMonthTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:month-')
const isAbstractTimePoint = (tp: TimePoint): boolean => tp.id === 'timepoint:today-abstract'
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

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const formatTimePointLabel = (tp: TimePoint): string => {
  if (isAbstractTimePoint(tp)) return `${tp.emoji} Today`
  if (isYearTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isMonthTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isTimeOfDayPoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isSolarTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isTimeTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  if (isLunarPhasePoint(tp)) return `${tp.emoji} ${tp.label}`
  return `${tp.emoji} ${formatDate(tp.date)}`
}

const TimePointList = forwardRef<TimePointListRef, TimePointListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const timePoint = props.items[index]
    let formattedDate: string
    if (isAbstractTimePoint(timePoint)) {
      formattedDate = 'Today'
    } else if (isYearTimePoint(timePoint) || isMonthTimePoint(timePoint)) {
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
      'data-date': isAbstractTimePoint(timePoint) ? '' : timePoint.date.toISOString(),
      'data-formatted': formattedDate,
      'data-relative-label': isAbstractTimePoint(timePoint) ? 'Today' : timePoint.label,
    })
  }

  const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length)
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
      {props.items.length > 0 ? (
        props.items.map((item: TimePoint, index) => (
          <motion.div
            className={`timepoint-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => selectItem(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="timepoint-emoji">{item.emoji}</span>
            <div className="timepoint-content">
              <span className="timepoint-label">{item.label}</span>
                {isAbstractTimePoint(item) ? (
                <span className="timepoint-date">Not tied to a specific date</span>
              ) : isYearTimePoint(item) ? (
                <span className="timepoint-date">January 1st, {item.label}</span>
              ) : isMonthTimePoint(item) ? (
                <span className="timepoint-date">1st {item.label}</span>
              ) : isTimeOfDayPoint(item) ? (
                <span className="timepoint-date">~{formatTime(item.date)} today</span>
              ) : isSolarTimePoint(item) ? (
                <span className="timepoint-date">~{formatTime(item.date)} today</span>
              ) : isTimeTimePoint(item) ? (
                <span className="timepoint-date">Today at {item.label}</span>
              ) : isLunarPhasePoint(item) ? (
                <span className="timepoint-date">{formatDateWithDay(item.date)}</span>
              ) : (
                <span className="timepoint-date">{formatDateWithDay(item.date)}</span>
              )}
            </div>
          </motion.div>
        ))
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

export const TimePointMention = Extension.create<TimePointOptions>({
  name: 'timepoint-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'timepoint-mention' },
      suggestion: {
        char: '@',
        allowSpaces: false,
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

export default TimePointMention
