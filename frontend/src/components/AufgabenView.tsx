import { useState } from 'react'
import WissenView from './WissenView'
import BildGeneratorView from './BildGeneratorView'
import { useTheme } from '../ThemeContext'
import { CheckSquare, Search, Sparkles, ArrowLeft, ArrowRight, Play, CircleDot } from 'lucide-react'

interface Template {
  id: string
  nameKey: string
  descKey: string
  categoryKey: string
  icon: typeof CheckSquare
  fields: { key: string; labelKey: string; type: string; required?: boolean; optionKeys?: string[] }[]
  prompt: string
}

type ToolKey = 'overview' | 'workflow' | 'wissen' | 'bilder'

const TEMPLATES: Template[] = [
  {
    id: 'new-task', nameKey: 'tpl.newTask', descKey: 'tpl.newTask.desc', categoryKey: 'cat.planning', icon: CheckSquare,
    fields: [
      { key: 'title', labelKey: 'field.title', type: 'text', required: true },
      { key: 'description', labelKey: 'field.description', type: 'textarea' },
      { key: 'due_date', labelKey: 'field.dueDate', type: 'date' },
      { key: 'priority', labelKey: 'field.priority', type: 'select', required: true, optionKeys: ['opt.low', 'opt.medium', 'opt.high'] },
    ],
    prompt: 'Erstelle eine neue Aufgabe: {title}\n\nBeschreibung: {description}\nFällig bis: {due_date}\nPriorität: {priority}',
  },
  {
    id: 'recurring-task', nameKey: 'tpl.recurring', descKey: 'tpl.recurring.desc', categoryKey: 'cat.planning', icon: CircleDot,
    fields: [
      { key: 'title', labelKey: 'field.task', type: 'text', required: true },
      { key: 'frequency', labelKey: 'field.frequency', type: 'select', required: true, optionKeys: ['opt.daily', 'opt.weekly', 'opt.monthly', 'opt.yearly'] },
      { key: 'start_date', labelKey: 'field.startDate', type: 'date', required: true },
      { key: 'description', labelKey: 'field.description', type: 'textarea' },
    ],
    prompt: 'Erstelle eine wiederkehrende Aufgabe: {title}\nHäufigkeit: {frequency}\nStart: {start_date}\nBeschreibung: {description}',
  },
  {
    id: 'review-task', nameKey: 'tpl.review', descKey: 'tpl.review.desc', categoryKey: 'cat.analysis', icon: Search,
    fields: [
      { key: 'date_range', labelKey: 'field.timeRange', type: 'select', required: true, optionKeys: ['opt.today', 'opt.thisWeek', 'opt.thisMonth'] },
      { key: 'status', labelKey: 'aufgaben.status', type: 'select', optionKeys: ['opt.all', 'opt.open', 'opt.inProgress', 'opt.done'] },
    ],
    prompt: 'Erstelle einen Aufgaben-Review für {date_range} mit Status: {status}',
  },
  {
    id: 'workflow-init', nameKey: 'tpl.workflow', descKey: 'tpl.workflow.desc', categoryKey: 'cat.workflow', icon: Play,
    fields: [
      { key: 'workflow_type', labelKey: 'field.workflowType', type: 'select', required: true, optionKeys: ['opt.prReview', 'opt.codeReview', 'opt.deployment', 'opt.testing'] },
      { key: 'target', labelKey: 'field.target', type: 'text', required: true },
      { key: 'notes', labelKey: 'field.notes', type: 'textarea' },
    ],
    prompt: 'Starte Workflow: {workflow_type}\n\nZiel: {target}\nNotizen: {notes}',
  },
]

const TOOL_CARDS: { key: ToolKey; icon: typeof CheckSquare; titleKey: string; descKey: string }[] = [
  { key: 'workflow', icon: CheckSquare, titleKey: 'tool.workflow', descKey: 'tool.workflow.desc' },
  { key: 'wissen', icon: Search, titleKey: 'tool.wissen', descKey: 'tool.wissen.desc' },
  { key: 'bilder', icon: Sparkles, titleKey: 'tool.bilder', descKey: 'tool.bilder.desc' },
]

export default function AufgabenView() {
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'executed'>('overview')
  const [selectedTool, setSelectedTool] = useState<ToolKey>('overview')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [executedTasks, setExecutedTasks] = useState<{ id: string; name: string; date: string; status: string }[]>([])

  const selectTool = (tool: ToolKey) => { setSelectedTool(tool); setSelectedTemplate(null); setFormData({}) }

  const handleExecute = async () => {
    if (!selectedTemplate) return
    const missing = selectedTemplate.fields.filter(field => field.required && !formData[field.key])
    if (missing.length) { alert(t('aufgaben.fillRequired')); return }
    let prompt = selectedTemplate.prompt
    Object.entries(formData).forEach(([key, value]) => { prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value) })
    try {
      const response = await fetch('/api/hermes/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      if (!response.ok) throw new Error('Execution failed')
      await response.json()
      setExecutedTasks(prev => [{ id: Date.now().toString(), name: t(selectedTemplate.nameKey), date: new Date().toISOString(), status: t('aufgaben.success') }, ...prev])
      setSelectedTemplate(null)
      setFormData({})
      alert(t('aufgaben.executionSuccess'))
    } catch {
      alert(t('aufgaben.executionError'))
    }
  }

  const renderTool = () => {
    if (selectedTool === 'wissen') return <WissenView />
    if (selectedTool === 'bilder') return <BildGeneratorView />
    return null
  }

  return (
    <section className="view aufgaben-view">
      <header className="view-header aufgaben-hero">
        <div className="view-title">
          <span className="eyebrow">{t('aufgaben.eyebrow')}</span>
          <h2>{t('aufgaben.title')}</h2>
          <p className="view-sub">{t('aufgaben.sub')}</p>
        </div>
        <div className="aufgaben-hero-mark"><CheckSquare size={36} /></div>
      </header>

      <div className="aufgaben-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); selectTool('overview') }}>{t('aufgaben.overview')}</button>
        <button className={`tab-btn ${activeTab === 'executed' ? 'active' : ''}`} onClick={() => setActiveTab('executed')}>{t('aufgaben.executed')} <span className="tab-count">{executedTasks.length}</span></button>
      </div>

      {activeTab === 'overview' && selectedTool === 'overview' && (
        <>
          <div className="task-intro">
            <div><h3>{t('aufgaben.whatToDo')}</h3><p>{t('aufgaben.allTools')}</p></div>
            <span className="task-intro-tip">{t('aufgaben.tip')}</span>
          </div>
          <div className="task-tool-grid">
            {TOOL_CARDS.map(tool => {
              const Icon = tool.icon
              return (
                <button key={tool.key} className="task-tool-card" onClick={() => selectTool(tool.key)}>
                  <span className="task-tool-icon"><Icon size={20} /></span>
                  <span className="task-tool-copy"><strong>{t(tool.titleKey)}</strong><small>{t(tool.descKey)}</small></span>
                  <span className="task-tool-arrow"><ArrowRight size={16} /></span>
                </button>
              )
            })}
          </div>
          <div className="task-section-heading">
            <div><span className="eyebrow">{t('aufgaben.quickstart')}</span><h3>{t('aufgaben.templates')}</h3></div>
            <span>{t('aufgaben.templatesCount').replace('{n}', String(TEMPLATES.length))}</span>
          </div>
          <div className="template-grid">
            {TEMPLATES.map(template => {
              const Icon = template.icon
              return (
                <button key={template.id} className="template-card" onClick={() => { setSelectedTool('workflow'); setSelectedTemplate(template); setFormData({}) }}>
                  <div className="template-card-top">
                    <span className="template-icon"><Icon size={16} /></span>
                    <span className="template-badge">{t(template.categoryKey)}</span>
                  </div>
                  <h3>{t(template.nameKey)}</h3>
                  <p className="template-description">{t(template.descKey)}</p>
                  <span className="template-action-btn">{t('aufgaben.configure')} <ArrowRight size={12} /></span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'overview' && selectedTool !== 'overview' && !selectedTemplate && (
        <div className="task-tool-view">
          <button className="back-btn" onClick={() => selectTool('overview')}><ArrowLeft size={14} /> {t('aufgaben.back')}</button>
          {renderTool()}
        </div>
      )}

      {activeTab === 'overview' && selectedTemplate && (
        <div className="template-form task-config-panel">
          <button className="back-btn" onClick={() => setSelectedTemplate(null)}><ArrowLeft size={14} /> {t('aufgaben.backTemplates')}</button>
          <div className="config-heading">
            <span className="template-icon">{(() => { const Icon = selectedTemplate.icon; return <Icon size={16} /> })()}</span>
            <div>
              <span className="eyebrow">{t('aufgaben.configuration')}</span>
              <h3>{t(selectedTemplate.nameKey)}</h3>
              <p className="view-sub">{t(selectedTemplate.descKey)}</p>
            </div>
          </div>
          <div className="form-fields">
            {selectedTemplate.fields.map(field => (
              <div key={field.key} className="form-field">
                <label>{t(field.labelKey)}{field.required && <span className="required">*</span>}</label>
                {field.type === 'textarea' ? (
                  <textarea value={formData[field.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={t('field.enter').replace('{label}', t(field.labelKey))} rows={3} />
                ) : field.type === 'select' && field.optionKeys ? (
                  <select value={formData[field.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}>
                    <option value="">{t('field.select')}</option>
                    {field.optionKeys.map(ok => <option key={ok} value={t(ok)}>{t(ok)}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={formData[field.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={t('field.enter').replace('{label}', t(field.labelKey))} />
                )}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="execute-btn" onClick={handleExecute}><Play size={14} /> {t('aufgaben.execute')}</button>
          </div>
        </div>
      )}

      {activeTab === 'executed' && (
        <div className="executed-tasks" style={{ padding: '0 28px' }}>
          {executedTasks.length === 0 ? (
            <div className="empty-state"><span className="empty-icon"><CircleDot size={32} /></span><p>{t('aufgaben.noExecuted')}</p><span>{t('aufgaben.executedHint')}</span></div>
          ) : (
            <table className="executed-table">
              <thead><tr><th>{t('aufgaben.task')}</th><th>{t('aufgaben.date')}</th><th>{t('aufgaben.status')}</th></tr></thead>
              <tbody>{executedTasks.map(task => <tr key={task.id}><td>{task.name}</td><td>{new Date(task.date).toLocaleString('de-DE')}</td><td><span className="status-pill">{task.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
    </section>
  )
}
