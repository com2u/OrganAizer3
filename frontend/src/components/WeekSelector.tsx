import { useTheme } from '../ThemeContext'

interface WeekSelectorProps {
  week: number
  onWeekChange: (week: number) => void
}

const WEEKS = [1, 2, 3, 4]

export default function WeekSelector({ week, onWeekChange }: WeekSelectorProps) {
  const { t } = useTheme()

  return (
    <div className="week-selector">
      <span className="week-label">{t('termine.week')}:</span>
      {WEEKS.map(w => (
        <button
          key={w}
          className={`week-btn ${w === week ? 'active' : ''}`}
          onClick={() => onWeekChange(w)}
        >
          {w}
        </button>
      ))}
    </div>
  )
}
