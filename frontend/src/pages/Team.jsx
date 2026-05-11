import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Users, Phone, Mail, Shield, User, CheckCircle2, AlertTriangle, X, Check, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

function UserForm({ initial, onSave, onCancel }) {
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
      if (initial) {
        const body = { name, email, role };
        if (password) body.password = password;
        await api.put(`/users/${initial.id}`, body);
      } else {
        await api.post('/users', { name, mobile, email, password, role });
      }
      toast.success(initial ? 'Staff updated' : 'Staff added');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{initial ? 'Edit Staff' : 'Add Staff'}</h3>
        <button type="button" onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Full Name *</label>
          <input className="input" placeholder="Staff name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {!initial && (
          <div className="col-span-2">
            <label className="label">Mobile Number *</label>
            <input className="input" placeholder="01700000000" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
        )}
        <div className="col-span-2">
          <label className="label">Email (for reminders)</label>
          <input type="email" className="input" placeholder="staff@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="label">{initial ? 'New Password (optional)' : 'Password *'}</label>
          <input type="password" className="input" placeholder="Min 6 chars" value={password} onChange={(e) => setPassword(e.target.value)} />
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

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { is_active: !u.is_active });
    toast.success(u.is_active ? 'Staff deactivated' : 'Staff activated');
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const staff = users.filter((u) => u.role === 'staff');
  const admins = users.filter((u) => u.role === 'admin');

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm">{users.length} members</p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        )}
      </div>

      {showForm && <UserForm onSave={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}
      {editing && <UserForm initial={editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}

      {admins.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admins</p>
          <div className="space-y-2">
            {admins.map((u) => <UserRow key={u.id} u={u} onEdit={setEditing} onToggle={toggleActive} />)}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Staff ({staff.length})</p>
        {staff.length === 0 && !showForm && (
          <div className="card p-10 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No staff yet. Add your first team member!</p>
          </div>
        )}
        <div className="space-y-2">
          {staff.map((u) => <UserRow key={u.id} u={u} onEdit={setEditing} onToggle={toggleActive} />)}
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, onEdit, onToggle }) {
  return (
    <div className={`card p-4 flex items-center gap-3 ${!u.is_active ? 'opacity-50' : ''}`}>
      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
        {u.name[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{u.name}</span>
          {u.role === 'admin' && (
            <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Admin
            </span>
          )}
          {!u.is_active && <span className="text-[10px] text-red-500">Inactive</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Phone className="w-3 h-3" />{u.mobile}
          </span>
          {u.email && (
            <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" />{u.email}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(u)} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onToggle(u)} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title={u.is_active ? 'Deactivate' : 'Activate'}>
          {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
