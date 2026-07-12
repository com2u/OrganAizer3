import { useMemo } from 'react'
import { Appointment } from '../types'
import { useTheme } from '../ThemeContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_KEYS = ['day.Monday', 'day.Tuesday', 'day.Wednesday', 'day.Thursday', 'day.Friday', 'day.Saturday', 'day.Sunday']
const HOUR_START = 7
const HOUR_END = 19
const PIXELS_PER_MINUTE = 2

interface WeeklyCalendarProps {
  week: number
  appointments: Appointment[]
  highlightMode: boolean
  isHighlighted: (apt: Appointment) => boolean
  onDoubleClick: (besprNr: number) => void
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function WeeklyCalendar({
  week,
  appointments,
  highlightMode,
  isHighlighted,
  onDoubleClick,
}: WeeklyCalendarProps) {
  const { t } = useTheme()

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const day of DAYS) map[day] = []
    for (const apt of appointments) {
      if (map[apt.tag]) map[apt.tag].push(apt)
    }
    return map
  }, [appointments])

  const totalHeight = (HOUR_END - HOUR_START) * 60 * PIXELS_PER_MINUTE

  return (
    <div className="weekly-calendar">
      <h3>KW {week}</h3>
      <div className="calendar-grid" style={{ height: totalHeight }}>
        <div className="time-axis">
          {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i).map(
            (hour) => (
              <div key={hour} className="time-label" style={{ top: (hour - HOUR_START) * 60 * PIXELS_PER_MINUTE }}>
                {hour.toString().padStart(2, '0')}:00
              </div>
            )
          )}
        </div>
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="day-column">
            <div className="day-header">{t(DAY_KEYS[dayIdx])}</div>
            <div className="day-appointments">
              {appointmentsByDay[day]?.map((apt, idx) => {
                const startMin = timeToMinutes(apt.start)
                const top = (startMin - HOUR_START * 60) * PIXELS_PER_MINUTE
                const height = apt.dauer_min * PIXELS_PER_MINUTE
                const highlighted = isHighlighted(apt)
                return (
                  <div
                    key={`${apt.id}-${idx}`}
                    className={`appointment-block${highlighted ? ' highlighted' : ''}${highlightMode && !highlighted ? ' dimmed' : ''}`}
                    style={{ top, height }}
                    onDoubleClick={() => onDoubleClick(apt.bespr_nr)}
                    title={`${apt.bespr_nr} ${apt.bezeichnung}`}
                  >
                    <div className="apt-header">
                      <span className="apt-number">#{apt.bespr_nr}</span>
                      <span className="apt-name">{apt.bezeichnung}</span>
                    </div>
                    <div className="apt-time">
                      {apt.start} -{' '}
                      {(() => {
                        const endMin = startMin + apt.dauer_min
                        const h = Math.floor(endMin / 60)
                        const m = endMin % 60
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
