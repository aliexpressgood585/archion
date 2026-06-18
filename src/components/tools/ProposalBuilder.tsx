import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ServiceItem {
  id: string
  label: string
  included: boolean
  fee: string
}

const DEFAULT_SERVICES: Omit<ServiceItem, 'id'>[] = [
  { label: 'בחינה מוקדמת ואבחון צרכים', included: true,  fee: '' },
  { label: 'תכנון מוקדם (קונספט)', included: true,  fee: '' },
  { label: 'פיתוח תכנון (DD)', included: true,  fee: '' },
  { label: 'הגשה לועדת תכנון ובנייה', included: true,  fee: '' },
  { label: 'תכנון לביצוע (CD)', included: true,  fee: '' },
  { label: 'מסמכי מכרז', included: false, fee: '' },
  { label: 'פיקוח עליון', included: false, fee: '' },
  { label: 'ניהול פרויקט', included: false, fee: '' },
]

export default function ProposalBuilder() {
  const [firmName, setFirmName] = useState('')
  const [clientName, setClientName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [proposalDate, setProposalDate] = useState(() => new Date().toLocaleDateString('he-IL'))
  const [validDays, setValidDays] = useState('30')
  const [services, setServices] = useState<ServiceItem[]>(
    DEFAULT_SERVICES.map(s => ({ ...s, id: crypto.randomUUID() }))
  )
  const [paymentTerms, setPaymentTerms] = useState('30 ימים מקבלת חשבונית')
  const [vatNote, setVatNote] = useState('כל הסכומים אינם כוללים מע"מ 17%')
  const [extraNotes, setExtraaNotes] = useState('')
  const [copied, setCopied] = useState(false)

  const toggleService = (id: string) =>
    setServices(ss => ss.map(s => s.id === id ? { ...s, included: !s.included } : s))
  const setFee = (id: string, fee: string) =>
    setServices(ss => ss.map(s => s.id === id ? { ...s, fee } : s))

  const includedServices = services.filter(s => s.included)
  const totalFee = includedServices.reduce((sum, s) => sum + (parseFloat(s.fee) || 0), 0)

  const generateProposal = () => {
    const today = proposalDate
    const lines = [
      `הצעת שכר טרחה`,
      `═══════════════`,
      '',
      `תאריך: ${today}`,
      firmName ? `משרד: ${firmName}` : '',
      `ללקוח: ${clientName || '——'}`,
      '',
      `נושא: הצעת שכר טרחה לשירותי אדריכלות`,
      projectDesc ? `פרויקט: ${projectDesc}` : '',
      projectAddress ? `כתובת: ${projectAddress}` : '',
      '',
      `שירותים המוצעים:`,
      `─────────────────`,
      ...includedServices.map((s, i) => {
        const fee = parseFloat(s.fee) || 0
        return `  ${i + 1}. ${s.label}${fee > 0 ? `  ....  ₪${Math.round(fee).toLocaleString('he-IL')}` : ''}`
      }),
      '',
      totalFee > 0 ? `סה"כ שכר טרחה: ₪${Math.round(totalFee).toLocaleString('he-IL')} (לפני מע"מ)` : '',
      totalFee > 0 ? `מע"מ (17%):      ₪${Math.round(totalFee * 0.17).toLocaleString('he-IL')}` : '',
      totalFee > 0 ? `סה"כ כולל מע"מ:  ₪${Math.round(totalFee * 1.17).toLocaleString('he-IL')}` : '',
      '',
      `תנאי תשלום: ${paymentTerms}`,
      vatNote,
      '',
      `הצעה זו בתוקף ל-${validDays} ימים מתאריך הנ"ל.`,
      '',
      extraNotes ? `הערות נוספות:\n${extraNotes}` : '',
      '',
      `_______________________`,
      firmName || 'חתימת המשרד',
    ].filter(l => l !== '')
    return lines.join('\n')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateProposal())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'שם המשרד', val: firmName, set: setFirmName, ph: 'משרד אדריכלות ...' },
          { label: 'שם הלקוח', val: clientName, set: setClientName, ph: 'שם הלקוח ...' },
          { label: 'תיאור הפרויקט', val: projectDesc, set: setProjectDesc, ph: 'דירת 4 חדרים, בנייה חדשה' },
          { label: 'כתובת הפרויקט', val: projectAddress, set: setProjectAddress, ph: 'רחוב ...' },
          { label: 'תאריך ההצעה', val: proposalDate, set: setProposalDate, ph: '' },
          { label: 'תוקף ההצעה (ימים)', val: validDays, set: setValidDays, ph: '30' },
        ].map(({ label, val, set, ph }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">שירותים — בחר והגדר תמחור</div>
        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors ${s.included ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
              <input type="checkbox" checked={s.included} onChange={() => toggleService(s.id)}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer shrink-0" />
              <span className={`flex-1 text-sm ${s.included ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{s.label}</span>
              {s.included && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-slate-500">₪</span>
                  <input type="number" value={s.fee} onChange={e => setFee(s.id, e.target.value)} placeholder="0"
                    className="w-24 border border-slate-200 rounded px-2 py-1 text-sm text-center bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {totalFee > 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 flex justify-between items-center">
          <div>
            <div className="text-sm text-emerald-600">סה"כ שכ"ט ללא מע"מ</div>
            <div className="text-2xl font-bold text-emerald-700">₪{Math.round(totalFee).toLocaleString('he-IL')}</div>
          </div>
          <div className="text-left">
            <div className="text-sm text-emerald-600">כולל מע"מ</div>
            <div className="text-xl font-bold text-emerald-800">₪{Math.round(totalFee * 1.17).toLocaleString('he-IL')}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תנאי תשלום</label>
          <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">הערת מע"מ</label>
          <input value={vatNote} onChange={e => setVatNote(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">הערות נוספות</label>
        <textarea value={extraNotes} onChange={e => setExtraaNotes(e.target.value)} rows={3}
          placeholder="תנאים מיוחדים, הגבלות, הבהרות..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <button onClick={handleCopy}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'הועתק!' : 'העתק הצעת שכ"ט'}
      </button>
    </div>
  )
}
