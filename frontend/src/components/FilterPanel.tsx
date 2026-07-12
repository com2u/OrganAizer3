import { useState, useRef, useEffect } from 'react'
import { Appointment, Usergruppe } from '../types'
import { useTheme } from '../ThemeContext'
import { Users, Calendar, ChevronDown, X } from 'lucide-react'

interface FilterPanelProps {
  usergruppen: Usergruppe[]
  selectedUsergruppen: string[]
  onUsergruppenChange: (usergruppen: string[]) => void
  appointments: Appointment[]
  selectedMeetings: number[]
  onMeetingsChange: (meetings: number[]) => void
  highlightMode: boolean
  onHighlightModeChange: (mode: boolean) => void
  onClearAll: () => void
}

export default function FilterPanel({
  usergruppen, selectedUsergruppen, onUsergruppenChange,
  appointments, selectedMeetings, onMeetingsChange,
  highlightMode, onHighlightModeChange, onClearAll,
}: FilterPanelProps) {
  const { t } = useTheme()
  const [showUsergruppeDropdown, setShowUsergruppeDropdown] = useState(false)
  const [showMeetingDropdown, setShowMeetingDropdown] = useState(false)
  const usergruppeRef = useRef<HTMLDivElement>(null)
  const meetingRef = useRef<HTMLDivElement>(null)

  const uniqueMeetings = Array.from(
    new Map(appointments.map((a) => [a.bespr_nr, a.bezeichnung])).entries()
  ).sort((a, b) => a[0] - b[0])

  const toggleUsergruppe = (nummer: string) => {
    onUsergruppenChange(
      selectedUsergruppen.includes(nummer)
        ? selectedUsergruppen.filter((u) => u !== nummer)
        : [...selectedUsergruppen, nummer]
    )
  }

  const toggleMeeting = (nr: number) => {
    onMeetingsChange(
      selectedMeetings.includes(nr)
        ? selectedMeetings.filter((m) => m !== nr)
        : [...selectedMeetings, nr]
    )
  }

  const hasFilter = selectedUsergruppen.length > 0 || selectedMeetings.length > 0

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (usergruppeRef.current && !usergruppeRef.current.contains(event.target as Node)) setShowUsergruppeDropdown(false)
      if (meetingRef.current && !meetingRef.current.contains(event.target as Node)) setShowMeetingDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="filter-panel">
      <div className="filter-controls">
        <div className="filter-dropdown" ref={usergruppeRef}>
          <button
            className={`filter-dropdown-btn ${selectedUsergruppen.length > 0 ? 'has-selection' : ''}`}
            onClick={() => setShowUsergruppeDropdown(!showUsergruppeDropdown)}
          >
            <span className="filter-icon"><Users size={14} /></span>
            <span className="filter-label-text">
              {selectedUsergruppen.length === 0 ? t('termine.usergroups') : `${t('termine.usergroups')} (${selectedUsergruppen.length})`}
            </span>
            <span className="dropdown-arrow"><ChevronDown size={12} /></span>
          </button>
          {showUsergruppeDropdown && (
            <div className="filter-dropdown-content">
              <div className="dropdown-search">
                <input type="text" placeholder={t('termine.search')} className="dropdown-search-input" />
              </div>
              <div className="dropdown-options">
                {usergruppen.map((ug) => (
                  <label key={ug.nummer} className="dropdown-option">
                    <input type="checkbox" checked={selectedUsergruppen.includes(ug.nummer)} onChange={() => toggleUsergruppe(ug.nummer)} />
                    <span className="option-code">{ug.nummer}</span>
                    <span className="option-text">{ug.bezeichnung}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="filter-dropdown" ref={meetingRef}>
          <button
            className={`filter-dropdown-btn ${selectedMeetings.length > 0 ? 'has-selection' : ''}`}
            onClick={() => setShowMeetingDropdown(!showMeetingDropdown)}
          >
            <span className="filter-icon"><Calendar size={14} /></span>
            <span className="filter-label-text">
              {selectedMeetings.length === 0 ? t('termine.meetings') : `${t('termine.meetings')} (${selectedMeetings.length})`}
            </span>
            <span className="dropdown-arrow"><ChevronDown size={12} /></span>
          </button>
          {showMeetingDropdown && (
            <div className="filter-dropdown-content">
              <div className="dropdown-search">
                <input type="text" placeholder={t('termine.search')} className="dropdown-search-input" />
              </div>
              <div className="dropdown-options">
                {uniqueMeetings.map(([nr, name]) => (
                  <label key={nr} className="dropdown-option" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedMeetings.includes(nr)} onChange={() => toggleMeeting(nr)} />
                    <span className="option-code">#{nr}</span>
                    <span className="option-text">{name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mode-toggle">
          <button className={`mode-btn ${!highlightMode ? 'active' : ''}`} onClick={() => onHighlightModeChange(false)}>{t('termine.filter')}</button>
          <button className={`mode-btn ${highlightMode ? 'active' : ''}`} onClick={() => onHighlightModeChange(true)}>{t('termine.highlight')}</button>
        </div>
      </div>

      <button className={`clear-btn ${!hasFilter ? 'hidden' : ''}`} onClick={onClearAll} disabled={!hasFilter}>
        <X size={14} />
      </button>
    </div>
  )
}
