import { Content } from "@tiptap/react"
import { Duration, DateTime } from "luxon"

type Concept = Content

type Temporal = Time | AntiTime
type TemporalOps = {
  createTemporal: () => Time,
}

type Time = {
  name: Concept,
  temporalStart: DateTime,
  contains: Time | AntiTime,
  temporalEnd: DateTime,
  duration: Duration,
}
type TimeOps = {
  createTime: () => Time,
  addToTime: (contains: AntiTime | Time) => Time,
}

type AntiTime = {
  name: Concept,
  temporalStart: DateTime,
  temporalEnd: DateTime,
  antiDuration: Duration
}
