import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO, isPast } from 'date-fns';
import { Megaphone, Plus, Trash2, Check, X, Users, CheckCircle2, Clock, Edit2 } from 'lucide-react';

function AckStatusModal({ ann, onClose }) {
  const [status, setStatus] = useState([]);
  useEffect(() => {
    api.get(`/announcements/${ann.id}/status`).then(({ data }) => setStatus(data));
  }, [ann.id]);

  const acked = status.filter(s => s.acknowledged_at);
  const pending = status.filter(s => !s.acknowledged_at);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Acknowledgements</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 font-medium truncate">{ann.title}</p>
        {pending.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 mb-2">Pending ({pending.length})</p>
            {pending.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-1.5">
                <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{s.name[0]?.toUpperCase()}</div>
                <span className="text-sm text-gray-700">{s.name}</span>
              </div>
            ))}
          </div>
        )}
        {acked.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-2">Acknowledged ({acked.length})</p>
            {acked.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-1.5">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">{s.name[0]?.toUpperCase()}</div>
                <span className="text-sm text-gray-700">{s.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{format(parseISO(s.acknowledged_at), 'dd MMM hh:mm a')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateModal({ initial, onClose, onSaved }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [expiresAt, setExpiresAt] = useState(initial?.expires_at ? initial.expires_at.slice(0, 16) : '');
  const [requiresAck, setRequiresAck] = useState(initial?.requires_ack ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const payload = { title, body, expires_at: expiresAt || null, requires_ack: requiresAck };
      if (initial?.id) await api.put(`/announcements/${initial.id}`, payload);
      else await api.post('/announcements', payload);
      toast.success(initial ? 'Announcement updated' : 'Announcement posted'); onSaved();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-orange-500" />{initial ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div><label className="label">Title *</label><input className="input" placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} required /></div>
          <div><label className="label">Message</label><textarea className="input resize-none" rows={3} placeholder="Details..." value={body} onChange={e => setBody(e.target.value)} /></div>
          <div><label className="label">Expires at (optional)</label><input type="datetime-local" className="input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <div onClick={() => setRequiresAck(!requiresAck)} className={`w-9 h-5 rounded-full relative shrink-0 ${requiresAck ? 'bg-orange-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${requiresAck ? 'left-4' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Require Acknowledgement</p>
              <p className="text-xs text-gray-400">Staff must tap "I Acknowledge" to confirm they've read this</p>
            </div>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Megaphone className="w-4 h-4" />{saving ? 'Saving...' : initial ? 'Update' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'hr'].includes(user?.role);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewAck, setViewAck] = useState(null);
  const [acking, setAcking] = useState(null);

  async function load() {
    try { const { data } = await api.get('/announcements'); setAnnouncements(data); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAck(id) {
    setAcking(id);
    try { await api.post(`/announcements/${id}/acknowledge`); toast.success('Acknowledged'); load(); }
    catch { toast.error('Failed'); } finally { setAcking(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`); toast.success('Deleted'); load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const unacked = announcements.filter(a => a.requires_ack && !a.my_ack);
  const requiringAck = announcements.filter(a => a.requires_ack).length;
  const expiredCount = announcements.filter(a => a.expires_at && isPast(parseISO(a.expires_at))).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-0.5">Share updates and track staff acknowledgement</p>
        </div>
        {isManager && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {announcements.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 px-4 py-2 rounded-xl text-sm font-semibold">
            <Megaphone className="w-3.5 h-3.5" />
            {announcements.length} total
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
            unacked.length > 0
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {unacked.length} pending ack
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold">
            <Users className="w-3.5 h-3.5" />
            {requiringAck} require ack
          </div>
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {expiredCount} expired
            </div>
          )}
        </div>
      )}

      {announcements.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No announcements yet</p>
          <p className="text-gray-400 text-sm mt-1">Post an announcement to share updates with your team</p>
          {isManager && (
            <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2 mt-5">
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          )}
        </div>
      )}

      {announcements.length > 0 && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {announcements.map(a => {
          const needsAck = a.requires_ack && !a.my_ack;
          const expired = a.expires_at && isPast(parseISO(a.expires_at));
          return (
            <div key={a.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${
              needsAck ? 'border-orange-200' : 'border-gray-200'
            }`}>
              <div className={`h-1 w-full ${needsAck ? 'bg-orange-400' : a.my_ack ? 'bg-emerald-400' : 'bg-gray-200'}`} />

              <div className="p-5 flex flex-col gap-4 min-h-[220px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      needsAck ? 'bg-orange-50' : 'bg-gray-100'
                    }`}>
                      <Megaphone className={`w-5 h-5 ${needsAck ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 leading-tight truncate">{a.title}</h3>
                        {needsAck && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">Needs Ack</span>}
                        {a.my_ack && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Acknowledged</span>}
                        {expired && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Expired</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                        <span>{a.author_name}</span>
                        <span>{format(parseISO(a.created_at), 'dd MMM, hh:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  {isManager && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditing(a)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Edit announcement">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete announcement">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {a.body ? (
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{a.body}</p>
                ) : (
                  <p className="text-sm text-gray-300">No message body</p>
                )}

                <div className="mt-auto space-y-3">
                  {a.expires_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Expires {format(parseISO(a.expires_at), 'dd MMM')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2 border-t border-gray-100 pt-3">
                    {isManager && a.requires_ack ? (
                      <button onClick={() => setViewAck(a)} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {a.ack_count}/{a.staff_count} acknowledged
                      </button>
                    ) : !a.requires_ack ? (
                      <span className="text-xs text-gray-400">No acknowledgement required</span>
                    ) : (
                      <span className="text-xs text-gray-400">Acknowledgement required</span>
                    )}
                    {needsAck && (
                      <button
                        onClick={() => handleAck(a.id)}
                        disabled={acking === a.id}
                        className="ml-auto btn-primary flex items-center gap-2 py-2 text-sm"
                      >
                        <Check className="w-4 h-4" />{acking === a.id ? 'Confirming...' : 'I Acknowledge'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />}
      {editing && <CreateModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {viewAck && <AckStatusModal ann={viewAck} onClose={() => setViewAck(null)} />}
    </div>
  );
}
