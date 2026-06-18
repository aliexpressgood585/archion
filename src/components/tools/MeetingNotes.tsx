import { useState } from 'react'
import { Plus, Trash2, Copy, Check } from 'lucide-react'

interface Attendee {
  id: string
  name: string
  role: string
}

interface AgendaItem {
  id: string
  topic: string
  decision: string
}

interface ActionItem {
  id: string
  task: string
  owner: string
  dueDate: string
  done: boolean
}

export default function MeetingNotes() {
  const [project, setProject] = useState('')
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('')
  const [nextMeeting, setNextMeeting] = useState('')
  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: crypto.randomUUID(), name: '', role: '' },
  ])
  const [agenda, setAgenda] = useState<AgendaItem[]>([
    { id: crypto.randomUUID(), topic: '', decision: '' },
  ])
  const [actions, setActions] = useState<ActionItem[]>([
    { id: crypto.randomUUID(), task: '', owner: '', dueDate: '', done: false },
  ])
  const [copied, setCopied] = useState(false)

  const addAttendee = () => setAttendees(a => [...a, { id: crypto.randomUUID(), name: '', role: '' }])
  const removeAttendee = (id: string) => setAttendees(a => a.filter(x => x.id !== id))
  const updateAttendee = (id: string, field: keyof Attendee, v: string) =>
    setAttendees(a => a.map(x => x.id === id ? { ...x, [field]: v } : x))

  const addAgenda = () => setAgenda(a => [...a, { id: crypto.randomUUID(), topic: '', decision: '' }])
  const removeAgenda = (id: string) => setAgenda(a => a.filter(x => x.id !== id))
  const updateAgenda = (id: string, field: keyof AgendaItem, v: string) =>
    setAgenda(a => a.map(x => x.id === id ? { ...x, [field]: v } : x))

  const addAction = () => setActions(a => [...a, { id: crypto.randomUUID(), task: '', owner: '', dueDate: '', done: false }])
  const removeAction = (id: string) => setActions(a => a.filter(x => x.id !== id))
  const updateAction = (id: string, field: keyof ActionItem, v: string | boolean) =>
    setActions(a => a.map(x => x.id === id ? { ...x, [field]: v } : x))

  const generateText = () => {
    const lines: string[] = [
      `פרוטוקול ישיבה`,
      `================`,
      `פרויקט: ${project || '—'}`,
      `נושא: ${subject || '—'}`,
      `תאריך: ${date}`,
      `מיקום: ${location || '—'}`,
      '',
      'משתתפים:',
      ...attendees.filter(a => a.name).map(a => `  • ${a.name}${a.role ? ` (${a.role})` : ''}`),
      '',
      'סדר יום ודיון:',
      ...agenda.filter(ag => ag.topic).map((ag, i) => [
        `  ${i + 1}. ${ag.topic}`,
        ag.decision ? `     החלטה: ${ag.decision}` : '',
      ].filter(Boolean).join('\n')),
      '',
      'משימות להמשך:',
      ...actions.filter(ac => ac.task).map((ac, i) =>
        `  ${i + 1}. ${ac.task}${ac.owner ? ` — אחראי: ${ac.owner}` : ''}${ac.dueDate ? ` · עד: ${ac.dueDate}` : ''}`
      ),
      '',
      nextMeeting ? `ישיבה הבאה: ${nextMeeting}` : '',
    ].filter(l => l !== undefined && l !== null)
    return lines.join('\n')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'פרויקט',   val: project,    set: setProject,    placeholder: 'שם הפרויקט' },
          { label: 'נושא',     val: subject,    set: setSubject,    placeholder: 'נושא הישיבה' },
          { label: 'מיקום',    val: location,   set: setLocation,   placeholder: 'כתובת / Zoom' },
          { label: 'ישיבה הבאה', val: nextMeeting, set: setNextMeeting, placeholder: 'תאריך הישיבה הבאה' },
        ].map(({ label, val, set, placeholder }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Attendees */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 text-sm">משתתפים</h3>
          <button onClick={addAttendee} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> הוסף
          </button>
        </div>
        <div className="space-y-2">
          {attendees.map(att => (
            <div key={att.id} className="flex items-center gap-2">
              <input value={att.name} onChange={e => updateAttendee(att.id, 'name', e.target.value)} placeholder="שם"
                className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input value={att.role} onChange={e => updateAttendee(att.id, 'role', e.target.value)} placeholder="תפקיד"
                className="w-36 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => removeAttendee(att.id)} className="p-1 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Agenda */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 text-sm">סדר יום ודיון</h3>
          <button onClick={addAgenda} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> הוסף
          </button>
        </div>
        <div className="space-y-3">
          {agenda.map((ag, i) => (
            <div key={ag.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-400 mt-2 w-5 shrink-0">{i + 1}.</span>
                <div className="flex-1 space-y-2">
                  <input value={ag.topic} onChange={e => updateAgenda(ag.id, 'topic', e.target.value)} placeholder="נושא הדיון"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input value={ag.decision} onChange={e => updateAgenda(ag.id, 'decision', e.target.value)} placeholder="החלטה / סיכום..."
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <button onClick={() => removeAgenda(ag.id)} className="p-1 text-slate-400 hover:text-red-500 mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 text-sm">משימות להמשך</h3>
          <button onClick={addAction} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> הוסף
          </button>
        </div>
        <div className="space-y-2">
          {actions.map(ac => (
            <div key={ac.id} className="flex items-center gap-2">
              <input type="checkbox" checked={ac.done} onChange={e => updateAction(ac.id, 'done', e.target.checked)}
                className="w-4 h-4 rounded text-green-600 cursor-pointer shrink-0" />
              <input value={ac.task} onChange={e => updateAction(ac.id, 'task', e.target.value)} placeholder="משימה"
                className={`flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${ac.done ? 'line-through text-slate-400' : ''}`} />
              <input value={ac.owner} onChange={e => updateAction(ac.id, 'owner', e.target.value)} placeholder="אחראי"
                className="w-28 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="date" value={ac.dueDate} onChange={e => updateAction(ac.id, 'dueDate', e.target.value)}
                className="border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => removeAction(ac.id)} className="p-1 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleCopy}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'הועתק!' : 'העתק פרוטוקול'}
      </button>
    </div>
  )
}
