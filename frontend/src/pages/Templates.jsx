import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Camera, Clock, FileText, X, Check } from 'lucide-react';

function TemplateForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [proof, setProof] = useState(initial?.proof_required ?? false);
  const [hours, setHours] = useState(initial?.default_deadline_hours || 24);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name required');
    setSaving(true);
    try {
      if (initial?.id) {
        await api.put(`/templates/${initial.id}`, { name, description: desc, proof_required: proof, default_deadline_hours: hours });
      } else {
        await api.post('/templates', { name, description: desc, proof_required: proof, default_deadline_hours: hours });
      }
      toast.success(initial ? 'Template updated' : 'Template created');
      onSave();
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{initial ? 'Edit Template' : 'New Template'}</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <label className="label">Template Name *</label>
        <input className="input" placeholder="e.g. Daily Stock Check" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} placeholder="Task description..." value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Default Deadline (hours)</label>
          <input type="number" className="input" min={1} max={168} value={hours} onChange={(e) => setHours(+e.target.value)} />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
            <div
              onClick={() => setProof(!proof)}
              className={`w-9 h-5 rounded-full transition-all ${proof ? 'bg-orange-500' : 'bg-gray-200'} relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${proof ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-gray-600">Proof Required</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`);
    toast.success('Deleted');
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Templates</h1>
          <p className="text-gray-500 text-sm mt-0.5">Reusable task blueprints</p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      {(showForm) && (
        <TemplateForm
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editing && (
        <TemplateForm
          initial={editing}
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="space-y-3">
        {templates.length === 0 && !showForm && (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No templates yet. Create your first one!</p>
          </div>
        )}
        {templates.map((t) => (
          <div key={t.id} className="card card-hover p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  {t.proof_required && (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg">
                      <Camera className="w-2.5 h-2.5" /> Proof
                    </span>
                  )}
                </div>
                {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                  <Clock className="w-3 h-3" />
                  {t.default_deadline_hours}h default deadline
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditing(t)}
                  className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
