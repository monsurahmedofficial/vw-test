import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import {
  Settings2, Tag, FileText, Store, Users, Sliders,
  Plus, Trash2, Edit2, X, Check, Camera, Clock,
  Phone, Mail, ToggleLeft, ToggleRight, Bell, ShieldCheck
} from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'blue',   cls: 'bg-blue-500' },
  { value: 'orange', cls: 'bg-orange-500' },
  { value: 'purple', cls: 'bg-purple-500' },
  { value: 'teal',   cls: 'bg-teal-500' },
  { value: 'amber',  cls: 'bg-amber-500' },
  { value: 'pink',   cls: 'bg-pink-500' },
  { value: 'gray',   cls: 'bg-gray-400' },
];

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700', orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700', teal: 'bg-teal-100 text-teal-700',
  amber: 'bg-amber-100 text-amber-700', pink: 'bg-pink-100 text-pink-700',
  gray: 'bg-gray-100 text-gray-600',
};

const PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', hint: 'View admin overview and business metrics' },
  { key: 'tasks', label: 'Tasks', hint: 'Manage team task board and assignments' },
  { key: 'attendance', label: 'Attendance', hint: 'Use and review attendance records' },
  { key: 'rosters', label: 'Roster', hint: 'Create and update employee rosters' },
  { key: 'announcements', label: 'Announcements', hint: 'Create notices and view acknowledgement status' },
  { key: 'team', label: 'Team', hint: 'Manage employees and account status' },
  { key: 'shops', label: 'Shops', hint: 'Manage branch records and shop status' },
  { key: 'templates', label: 'Templates', hint: 'Manage reusable task templates' },
  { key: 'categories', label: 'Task Category', hint: 'Manage task labels and colors' },
  { key: 'settings', label: 'Settings', hint: 'Access system settings and permissions' },
];

const EMPTY_PERMISSIONS = PERMISSION_GROUPS.reduce((acc, permission) => {
  acc[permission.key] = false;
  return acc;
}, {});

const TABS = [
  { id: 'workflow',    label: 'Workflow',       icon: Sliders },
  { id: 'roles',       label: 'Roles & Access', icon: ShieldCheck },
  { id: 'categories', label: 'Task Category',     icon: Tag },
  { id: 'templates',  label: 'Task Templates', icon: FileText },
  { id: 'team',       label: 'Team',           icon: Users },
  { id: 'shops',      label: 'Shops',          icon: Store },
  { id: 'general',    label: 'General',        icon: Bell },
];

// ── Workflow Tab ──────────────────────────────────────────────
function WorkflowTab() {
  const { settings, reload } = useSettings();
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [s3, setS3] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setS1(settings.stage_1_name || '');
    setS2(settings.stage_2_name || '');
    setS3(settings.stage_3_name || '');
  }, [settings]);

  async function save(e) {
    e.preventDefault();
    if (!s1.trim() || !s2.trim() || !s3.trim()) return toast.error('All stage names required');
    setSaving(true);
    try {
      await api.put('/settings', { stage_1_name: s1.trim(), stage_2_name: s2.trim(), stage_3_name: s3.trim() });
      toast.success('Workflow updated'); reload();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  }

  const stages = [
    { label: 'Stage 1', val: s1, set: setS1, dot: 'bg-gray-400', hint: 'e.g. Pending' },
    { label: 'Stage 2', val: s2, set: setS2, dot: 'bg-blue-500', hint: 'e.g. On-Process' },
    { label: 'Stage 3', val: s3, set: setS3, dot: 'bg-emerald-500', hint: 'e.g. Completed' },
  ];

  return (
    <form onSubmit={save} className="space-y-4 max-w-md">
      <p className="text-sm text-gray-500">Customize the names of your task workflow stages.</p>
      {stages.map(st => (
        <div key={st.label}>
          <label className="label flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} /> {st.label}
          </label>
          <input className="input" placeholder={st.hint} value={st.val} onChange={e => st.set(e.target.value)} required />
        </div>
      ))}
      <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
        <Check className="w-4 h-4" />{saving ? 'Saving...' : 'Save Workflow'}
      </button>
    </form>
  );
}

// ── Categories Tab ────────────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() { const { data } = await api.get('/categories'); setCats(data); }
  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/categories', { name: name.trim(), color });
      toast.success('Category added'); setName(''); setColor('blue'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  }

  async function handleUpdate(cat) {
    try {
      await api.put(`/categories/${cat.id}`, { name: cat.name, color: cat.color });
      toast.success('Updated'); setEditing(null); load();
    } catch { toast.error('Failed'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/categories/${id}`); toast.success('Deleted'); load();
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="card p-6 border-l-4 border-l-orange-400 bg-gradient-to-r from-orange-50/30 to-transparent">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-orange-500" /> Create New Task Category
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div className="flex-1 w-full">
            <label className="label text-xs uppercase tracking-wider font-bold text-gray-500">Task Category Name</label>
            <input className="input" placeholder="e.g. Marketing" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="w-full sm:w-auto">
            <label className="label text-xs uppercase tracking-wider font-bold text-gray-500">Theme Color</label>
            <div className="flex gap-2 items-center h-[50px] px-3 bg-white border border-gray-200 rounded-xl shadow-sm">
              {COLOR_OPTIONS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.cls} shadow-sm transition-all duration-200 ${color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-40 hover:opacity-100 hover:scale-110'}`} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2 h-[50px] px-8 w-full sm:w-auto whitespace-nowrap shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4" /> Add Task Category
          </button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-800">Existing Task Categories</p>
          <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{cats.length} total</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cats.map(cat => (
            <div key={cat.id} className="card p-4 flex flex-col justify-between group hover:border-orange-200 hover:shadow-md transition-all duration-200">
              {editing?.id === cat.id ? (
                <div className="space-y-4">
                  <input className="input py-2.5 text-sm" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                  <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 rounded-xl justify-center border border-gray-100">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.value} type="button" onClick={() => setEditing({ ...editing, color: c.value })}
                        className={`w-6 h-6 rounded-full ${c.cls} shadow-sm transition-all ${editing.color === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-40 hover:opacity-100'}`} />
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleUpdate(editing)} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"><Check className="w-3.5 h-3.5" /> Save</button>
                    <button onClick={() => setEditing(null)} className="flex-1 bg-gray-50 text-gray-500 hover:bg-gray-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-[13px] font-bold px-3.5 py-1.5 rounded-lg shadow-sm ${COLOR_MAP[cat.color] || COLOR_MAP.gray}`}>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing({ ...cat })} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-colors"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                    <div className="w-px h-4 bg-gray-200" />
                    <button onClick={() => handleDelete(cat.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {cats.length === 0 && (
          <div className="card p-12 flex flex-col items-center justify-center bg-gray-50/50 border-dashed">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Tag className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-bold text-lg">No task categories created yet</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">Use the form above to add your first task category to start organizing tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────
function RoleForm({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [permissions, setPermissions] = useState(initial?.permissions || EMPTY_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  function togglePermission(key) {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim()) return toast.error('Role name required');
    setSaving(true);
    try {
      const body = { label: label.trim(), permissions };
      if (initial?.key) await api.put(`/roles/${initial.key}`, body);
      else await api.post('/roles', body);
      toast.success(initial ? 'Role updated' : 'Role created');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">{initial ? 'Edit Role' : 'New Role'}</h3>
        <button type="button" onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
      </div>
      <div>
        <label className="label">Role Name</label>
        <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Area Manager" required />
        {initial?.key && <p className="text-[11px] text-gray-400 mt-1">Role key: {initial.key}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSION_GROUPS.map(permission => (
          <button key={permission.key} type="button" onClick={() => togglePermission(permission.key)}
            className={`text-left rounded-xl border p-3 transition-all ${permissions[permission.key] ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{permission.label}</p>
              <span className={`w-8 h-4 rounded-full relative shrink-0 ${permissions[permission.key] ? 'bg-orange-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${permissions[permission.key] ? 'left-4' : 'left-0.5'}`} />
              </span>
            </div>
            <p className="text-[11px] opacity-70 mt-1">{permission.hint}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save Role'}
        </button>
      </div>
    </form>
  );
}

function RolesTab() {
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    const { data } = await api.get('/roles');
    setRoles(data);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(role) {
    if (!confirm(`Delete role "${role.label}"?`)) return;
    try {
      await api.delete(`/roles/${role.key}`);
      toast.success('Role deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Create role types and define which modules each role can access.</p>
          <p className="text-xs text-gray-400 mt-1">System roles can be edited but not deleted.</p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2 text-sm">
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
        )}
      </div>
      {showForm && <RoleForm onSave={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}
      {editing && <RoleForm initial={editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {roles.map(role => {
          const enabled = PERMISSION_GROUPS.filter(permission => role.permissions?.[permission.key]);
          return (
            <div key={role.key} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{role.label}</p>
                    {role.is_system && <span className="text-[10px] rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">System</span>}
                  </div>
                  <p className="text-[11px] text-gray-400">{role.key}</p>
                </div>
                <button onClick={() => { setEditing(role); setShowForm(false); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                {!role.is_system && <button onClick={() => handleDelete(role)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enabled.length > 0 ? enabled.map(permission => (
                  <span key={permission.key} className="text-[10px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1">
                    {permission.label}
                  </span>
                )) : <span className="text-xs text-gray-400">No module permissions enabled.</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      if (initial?.id) await api.put(`/templates/${initial.id}`, { name, description: desc, proof_required: proof, default_deadline_hours: hours });
      else await api.post('/templates', { name, description: desc, proof_required: proof, default_deadline_hours: hours });
      toast.success(initial ? 'Updated' : 'Template created'); onSave();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">{initial ? 'Edit Template' : 'New Template'}</h3>
        <button type="button" onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
      </div>
      <input className="input" placeholder="Template name *" value={name} onChange={e => setName(e.target.value)} required />
      <textarea className="input resize-none" rows={2} placeholder="Description..." value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label">Default deadline (hours)</label>
          <input type="number" className="input" min={1} max={168} value={hours} onChange={e => setHours(+e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 h-[42px]">
            <div onClick={() => setProof(!proof)} className={`w-8 h-4 rounded-full relative shrink-0 ${proof ? 'bg-orange-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${proof ? 'left-4' : 'left-0.5'}`} />
            </div>
            <Camera className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-600">Proof</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() { const { data } = await api.get('/templates'); setTemplates(data); }
  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`); toast.success('Deleted'); load();
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Reusable task blueprints for common operations.</p>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2 text-sm">
            <Plus className="w-3.5 h-3.5" /> New Template
          </button>
        )}
      </div>
      {showForm && <TemplateForm onSave={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}
      {editing && <TemplateForm initial={editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                {t.proof_required ? <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Camera className="w-2.5 h-2.5" />Proof</span> : null}
              </div>
              {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
              <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{t.default_deadline_hours}h deadline</p>
            </div>
            <button onClick={() => { setEditing(t); setShowForm(false); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {templates.length === 0 && !showForm && (
          <div className="card p-10 text-center"><p className="text-gray-400 text-sm">No templates yet.</p></div>
        )}
      </div>
    </div>
  );
}

// ── Team Tab ──────────────────────────────────────────────────
function UserForm({ initial, roles, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [mobile, setMobile] = useState(initial?.mobile || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [role, setRole] = useState(initial?.role || 'staff');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !mobile) return toast.error('Name and mobile required');
    if (!initial && !password) return toast.error('Password required');
    setSaving(true);
    try {
      if (initial) { const body = { name, email, role }; if (password) body.password = password; await api.put(`/users/${initial.id}`, body); }
      else await api.post('/users', { name, mobile, email, password, role });
      toast.success(initial ? 'Updated' : 'Added'); onSave();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">{initial ? 'Edit Member' : 'Add Member'}</h3>
        <button type="button" onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Full Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} required /></div>
        {!initial && <div className="col-span-2"><label className="label">Mobile *</label><input className="input" placeholder="01700000000" value={mobile} onChange={e => setMobile(e.target.value)} /></div>}
        <div className="col-span-2"><label className="label">Email (for reminders)</label><input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={e => setRole(e.target.value)}>
            {roles.map(role => <option key={role.key} value={role.key}>{role.label}</option>)}
          </select>
        </div>
        <div><label className="label">{initial ? 'New Password' : 'Password *'}</label><input type="password" className="input" placeholder="Min 6 chars" value={password} onChange={e => setPassword(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

function TeamTab() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    const [userRes, roleRes] = await Promise.all([api.get('/users'), api.get('/roles')]);
    setUsers(userRes.data);
    setRoles(roleRes.data);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { is_active: !u.is_active });
    toast.success(u.is_active ? 'Deactivated' : 'Activated'); load();
  }

  const ROLE_BADGE = {
    admin: 'bg-orange-50 text-orange-600 border-orange-200',
    hr: 'bg-blue-50 text-blue-600 border-blue-200',
    staff: 'bg-gray-50 text-gray-500 border-gray-200',
  };

  const roleMap = roles.reduce((acc, role) => ({ ...acc, [role.key]: role }), {});
  const grouped = roles.map(role => ({
    role,
    users: users.filter(u => u.role === role.key),
  })).filter(group => group.users.length > 0);

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} team members</p>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2 text-sm"><Plus className="w-3.5 h-3.5" /> Add Member</button>
        )}
      </div>
      {showForm && <UserForm roles={roles} onSave={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}
      {editing && <UserForm initial={editing} roles={roles} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
      {grouped.map(({ role, users }) =>
        users.length > 0 ? (
          <div key={role.key}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{role.label} ({users.length})</p>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className={`card p-3 flex items-center gap-3 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">{u.name[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{u.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_BADGE[u.role] || ROLE_BADGE.staff}`}>{roleMap[u.role]?.label || u.role}</span>
                      {!u.is_active && <span className="text-[10px] text-red-400">Inactive</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{u.mobile}</span>
                      {u.email && <span className="text-xs text-gray-400 flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{u.email}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setEditing(u); setShowForm(false); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(u)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg">
                    {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

// ── Shops Tab ─────────────────────────────────────────────────
function ShopsTab() {
  const [shops, setShops] = useState([]);
  const [name, setName] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() { const { data } = await api.get('/shops'); setShops(data); }
  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/shops', { name: name.trim(), default_open_time: openTime, default_close_time: closeTime });
      toast.success('Shop added'); setName(''); load();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  }

  async function handleUpdate(s) {
    try {
      await api.put(`/shops/${s.id}`, { name: s.name, default_open_time: s.default_open_time, default_close_time: s.default_close_time });
      toast.success('Updated'); setEditing(null); load();
    } catch { toast.error('Failed'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this shop?')) return;
    await api.delete(`/shops/${id}`); toast.success('Deleted'); load();
  }

  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-sm text-gray-500">Manage your branch locations. Staff check in to these shops.</p>
      <form onSubmit={handleAdd} className="card p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Add New Shop</p>
        <input className="input" placeholder="Shop / Branch name *" value={name} onChange={e => setName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Default Open Time</label><input type="time" className="input" value={openTime} onChange={e => setOpenTime(e.target.value)} /></div>
          <div><label className="label">Default Close Time</label><input type="time" className="input" value={closeTime} onChange={e => setCloseTime(e.target.value)} /></div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 w-full justify-center py-2 text-sm">
          <Plus className="w-4 h-4" />{saving ? 'Adding...' : 'Add Shop'}
        </button>
      </form>
      <div className="space-y-2">
        {shops.map(s => (
          <div key={s.id} className="card p-4">
            {editing?.id === s.id ? (
              <div className="space-y-3">
                <input className="input text-sm" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" className="input text-sm" value={editing.default_open_time} onChange={e => setEditing({ ...editing, default_open_time: e.target.value })} />
                  <input type="time" className="input text-sm" value={editing.default_close_time} onChange={e => setEditing({ ...editing, default_close_time: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(editing)} className="btn-primary flex-1 py-1.5 text-sm flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" />Save</button>
                  <button onClick={() => setEditing(null)} className="btn-ghost flex-1 py-1.5 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.default_open_time} – {s.default_close_time}</p>
                </div>
                <button onClick={() => setEditing({ ...s })} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
        {shops.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No shops yet. Add your first branch above.</p>}
      </div>
    </div>
  );
}

// ── General Tab ───────────────────────────────────────────────
function GeneralTab() {
  const { settings, reload } = useSettings();
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setVals({ ...settings }); }, [settings]);

  const set = (k, v) => setVals(prev => ({ ...prev, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await api.put('/settings', vals); toast.success('Settings saved'); reload(); }
    catch { toast.error('Failed'); } finally { setSaving(false); }
  }

  const reminderFields = [
    { key: 'reminder_task_hours_before',        label: 'Remind before deadline (hours)',          hint: '4' },
    { key: 'reminder_stuck_hours',               label: 'Alert if task stuck in-progress (hours)', hint: '3' },
    { key: 'reminder_overdue_interval_hours',    label: 'Re-alert on overdue every (hours)',       hint: '6' },
    { key: 'reminder_announcement_ack_hours',    label: 'First ack reminder after (hours)',        hint: '2' },
    { key: 'reminder_announcement_repeat_hours', label: 'Repeat ack reminder every (hours)',       hint: '4' },
  ];

  return (
    <form onSubmit={save} className="space-y-5 max-w-md">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Bell className="w-4 h-4 text-orange-500" />Reminder Rules</p>
        <p className="text-xs text-gray-400">Configure when the system sends email reminders to staff.</p>
        {reminderFields.map(f => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input type="number" className="input" min={1} placeholder={f.hint} value={vals[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
        <Check className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}

// ── Main Settings Page ────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState('workflow');
  const TAB_CONTENT = { workflow: WorkflowTab, roles: RolesTab, categories: CategoriesTab, templates: TemplatesTab, team: TeamTab, shops: ShopsTab, general: GeneralTab };
  const ActiveComponent = TAB_CONTENT[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-orange-500" /> Settings
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your CRM configuration</p>
      </div>
      <div className="flex gap-0 flex-wrap border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>
      <ActiveComponent />
    </div>
  );
}
