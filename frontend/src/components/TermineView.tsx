import { useEffect, useState } from 'react'
import WeeklyCalendar from './WeeklyCalendar'
import WeekSelector from './WeekSelector'
import FilterPanel from './FilterPanel'
import ImportExport from './ImportExport'
import AppointmentDetail from './AppointmentDetail'
import { Appointment, TerminDetail, Usergruppe } from '../types'
import { fetchWeekAppointments, fetchTerminDetail, fetchUsergruppen } from '../api'
import { useTheme } from '../ThemeContext'

export default function TermineView() {
  const { t } = useTheme()
  const [week, setWeek] = useState<number>(1)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [usergruppen, setUsergruppen] = useState<Usergruppe[]>([])
  const [selectedUsergruppen, setSelectedUsergruppen] = useState<string[]>([])
  const [selectedMeetings, setSelectedMeetings] = useState<number[]>([])
  const [highlightMode, setHighlightMode] = useState<boolean>(false)
  const [detailAppointment, setDetailAppointment] = useState<TerminDetail | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetchWeekAppointments(week).then(setAppointments).catch(console.error)
  }, [week])

  useEffect(() => {
    fetchUsergruppen().then(setUsergruppen).catch(console.error)
  }, [])

  const handleDoubleClick = async (besprNr: number) => {
    try {
      const detail = await fetchTerminDetail(besprNr)
      setDetailAppointment(detail)
      setShowDetail(true)
    } catch (e) { console.error(e) }
  }

  const clearAllFilters = () => {
    setSelectedUsergruppen([])
    setSelectedMeetings([])
  }

  const matchesFilters = (apt: Appointment): boolean => {
    if (selectedUsergruppen.length === 0 && selectedMeetings.length === 0) return true
    if (selectedMeetings.length > 0 && !selectedMeetings.includes(apt.bespr_nr)) return false
    if (selectedUsergruppen.length > 0 && !apt.teilnehmer.some((tn) => selectedUsergruppen.includes(tn))) return false
    return true
  }

  const isHighlighted = (apt: Appointment): boolean => matchesFilters(apt)

  const sortedAppointments = highlightMode
    ? [...appointments].sort((a, b) => (isHighlighted(b) ? 1 : 0) - (isHighlighted(a) ? 1 : 0))
    : appointments.filter(matchesFilters)

  return (
    <section className="view termine-view">
      <header className="view-header">
        <div className="view-title">
          <h2>{t('termine.title')}</h2>
          <p className="view-sub">{t('termine.sub')}</p>
        </div>
        <div className="view-header-controls">
          <WeekSelector week={week} onWeekChange={setWeek} />
          <ImportExport onImportSuccess={() => fetchWeekAppointments(week).then(setAppointments)} />
        </div>
      </header>

      <FilterPanel
        usergruppen={usergruppen}
        selectedUsergruppen={selectedUsergruppen}
        onUsergruppenChange={setSelectedUsergruppen}
        appointments={appointments}
        selectedMeetings={selectedMeetings}
        onMeetingsChange={setSelectedMeetings}
        highlightMode={highlightMode}
        onHighlightModeChange={setHighlightMode}
        onClearAll={clearAllFilters}
      />

      <WeeklyCalendar
        week={week}
        appointments={sortedAppointments}
        highlightMode={highlightMode}
        isHighlighted={isHighlighted}
        onDoubleClick={handleDoubleClick}
      />

      {showDetail && detailAppointment && (
        <AppointmentDetail
          detail={detailAppointment}
          week={week}
          onClose={() => setShowDetail(false)}
        />
      )}
    </section>
  )
}
