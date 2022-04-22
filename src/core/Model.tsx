import { Content } from "@tiptap/react"
import { Duration, DateTime } from "luxon"

type Concept = Content

type Temporal = Time | AntiTime

type Time = {
  name: Concept,
  temporalStart: DateTime,
  contains: Time | AntiTime,
  temporalEnd: DateTime,
  duration: Duration,
}

type AntiTime = {
  name: Concept,
  temporalStart: DateTime,
  temporalEnd: DateTime,
  antiDuration: Duration
}
