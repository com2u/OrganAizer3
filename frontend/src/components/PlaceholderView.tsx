import { useTheme } from '../ThemeContext'

interface PlaceholderViewProps {
  icon: string
  title: string
  description: string
  features: { icon: string; text: string }[]
}

export default function PlaceholderView({ icon, title, description, features }: PlaceholderViewProps) {
  const { t } = useTheme()
  void t

  return (
    <div className="placeholder-body">
      <div className="placeholder-card">
        <div className="placeholder-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <ul className="placeholder-features">
          {features.map((f, i) => (
            <li key={i}>
              <span className="feat-icon">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
