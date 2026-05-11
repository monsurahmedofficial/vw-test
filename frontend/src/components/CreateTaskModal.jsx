import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { X, Plus, User, FileText, Camera, Tag, RefreshCw, Clock } from 'lucide-react';
import { addHours, addDays, endOfDay, format } from 'date-fns';
import { DAYS } from '../config/categories';

const QUICK_DEADLINES = [
  { label: '+2h',       fn: () => addHours(new Date(), 2) },
  { label: '+4h',       fn: () => addHours(new Date(), 4) },
  { label: 'EOD',       fn: () => endOfDay(new Date()) },
  { label: 'Tomorrow',  fn: () => endOfDay(addDays(new Date(), 1)) },
  { label: '+2 days',   fn: () => endOfDay(addDays(new Date(), 2)) },
  { label: 'Custom',    fn: null },
];

export default function CreateTaskModal({ onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineMode, setDeadlineMode] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [proofRequired, setProofRequired] = useState(false);
  const [category, setCategory] = useState('');
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/templates'), api.get('/categories')]).then(([u, t, c]) => {
      setUsers(u.data.filter(x => x.role === 'staff' && x.is_active));
      setTemplates(t.data);
      setCategories(c.data);
    });
  }, []);

  function applyTemplate(tid) {
    setTemplateId(tid);
    if (!tid) return;
    const t = templates.find(x => x.id === +tid);
    if (!t) return;
    if (!title) setTitle(t.name);
    if (!desc) setDesc(t.description || '');
    setProofRequired(t.proof_required);
    if (!deadline) {
      const d = addHours(new Date(), t.default_deadline_hours);
      setDeadline(format(d, "yyyy-MM-dd'T'HH:mm"));
    }
  }

  function selectQuick(opt) {
    setDeadlineMode(opt.label);
    if (opt.fn) {
      setDeadline(format(opt.fn(), "yyyy-MM-dd'T'HH:mm"));
    } else {
      setDeadline('');
    }
  }

  function toggleDay(d) {
    setRepeatDays(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !assignedTo) return toast.error('Title and assignee required');
    if (isRepeat && repeatDays.size === 0) return toast.error('Select at least one repeat day');
    setSaving(true);
    try {
      await api.post('/tasks', {
        title, description: desc, assigned_to: assignedTo,
        deadline: deadline || null, template_id: templateId || null,
        proof_required: proofRequired,
        category: category || null,
        is_repeat: isRepeat ? 1 : 0,
        repeat_days: isRepeat ? [...repeatDays].sort((a, b) => a - b).join(',') : null,
      });
      toast.success('Task assigned!'); onCreated?.(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-md card rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-500" /> Assign New Task
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
          {/* Template */}
          <div>
            <label className="label flex items-center gap-1"><FileText className="w-3 h-3" /> Template (optional)</label>
            <select className="input py-2 text-sm" value={templateId} onChange={e => applyTemplate(e.target.value)}>
              <option value="">— Select template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="label">Task Title *</label>
            <input className="input" placeholder="e.g. Shelf refill – Dhanmondi" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none text-sm" rows={2} placeholder="Additional instructions..." value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          {/* Category + Assign row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Tag className="w-3 h-3" /> Category</label>
              <select className="input py-2 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1"><User className="w-3 h-3" /> Assign To *</label>
              <select className="input py-2 text-sm" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required>
                <option value="">— Select staff —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Deadline quick-pick */}
          <div>
            <label className="label flex items-center gap-1"><Clock className="w-3 h-3" /> Deadline</label>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_DEADLINES.map(opt => (
                <button key={opt.label} type="button" onClick={() => selectQuick(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    deadlineMode === opt.label
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {deadlineMode === 'Custom' && (
              <input type="datetime-local" className="input mt-2 text-sm"
                value={deadline} onChange={e => setDeadline(e.target.value)} />
            )}
            {deadline && deadlineMode !== 'Custom' && (
              <p className="text-xs text-gray-400 mt-1">{format(new Date(deadline), 'dd MMM yyyy, hh:mm a')}</p>
            )}
          </div>

          {/* Repeat toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
            <div onClick={() => setIsRepeat(!isRepeat)} className={`w-9 h-5 rounded-full transition-all ${isRepeat ? 'bg-orange-500' : 'bg-gray-200'} relative shrink-0`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isRepeat ? 'left-4' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Repeat Task</p>
              <p className="text-xs text-gray-400">Auto-creates next instance when completed</p>
            </div>
          </label>

          {isRepeat && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
              <p className="text-xs font-semibold text-blue-700">Repeat on days</p>
              <div className="flex gap-1.5">
                {DAYS.map(d => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                      repeatDays.has(d.value) ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {repeatDays.size === 0 && <p className="text-xs text-blue-500">Select at least one day</p>}
            </div>
          )}

          {/* Proof toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
            <div onClick={() => setProofRequired(!proofRequired)} className={`w-9 h-5 rounded-full transition-all ${proofRequired ? 'bg-orange-500' : 'bg-gray-200'} relative shrink-0`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${proofRequired ? 'left-4' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-amber-500" /> Proof Photo Required</p>
              <p className="text-xs text-gray-400">Staff must upload a photo to complete</p>
            </div>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              Assign Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
