import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';
import {
  ArrowLeft, Camera, Send, Trash2, CheckCircle2,
  Clock, AlertTriangle, User, FileText, X, RefreshCw
} from 'lucide-react';
import { categoryStyle, DAYS } from '../config/categories';

const STATUS_FLOW = ['todo', 'doing', 'done'];
const STATUS_COLORS = {
  todo: 'text-gray-500',
  doing: 'text-blue-600',
  done: 'text-emerald-600',
};

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const STATUS_LABELS = {
    todo: settings.stage_1_name,
    doing: settings.stage_2_name,
    done: settings.stage_3_name,
  };

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  // Inline complete-with-photo state
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeFile, setCompleteFile] = useState(null);
  const [completePreview, setCompletePreview] = useState(null);
  const completeFileRef = useRef();

  async function load() {
    try {
      const { data } = await api.get(`/tasks/${id}`);
      setTask(data);
    } catch {
      toast.error('Task not found');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!note.trim() && !file) return toast.error('Add a note or photo');
    setSubmitting(true);
    try {
      const form = new FormData();
      if (note.trim()) form.append('note', note.trim());
      if (file) form.append('proof', file);
      await api.post(`/tasks/${id}/updates`, form);
      toast.success('Update posted');
      setNote('');
      setFile(null);
      setPreview(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function moveStatus(newStatus) {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('status', newStatus);
      await api.patch(`/tasks/${id}/status`, form);
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCompleteFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setCompleteFile(f);
    setCompletePreview(URL.createObjectURL(f));
  }

  async function handleCompleteSubmit(e) {
    e.preventDefault();
    if (task.proof_required && !completeFile) {
      return toast.error('Photo proof required to complete this task');
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('status', 'done');
      if (completeFile) form.append('proof', completeFile);
      await api.patch(`/tasks/${id}/status`, form);
      toast.success(`Task marked as ${STATUS_LABELS.done}`);
      setShowCompleteForm(false);
      setCompleteFile(null);
      setCompletePreview(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    toast.success('Task deleted');
    navigate(-1);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'done';
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(task.status) + 1];
  const isAssignee = task.assigned_to === user.id;
  const canUpdate = user.role === 'admin' || isAssignee;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 min-w-0 truncate">{task.title}</h1>
        {user.role === 'admin' && (
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Task info */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`text-sm font-semibold ${STATUS_COLORS[task.status]}`}>
            ● {STATUS_LABELS[task.status]}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {task.category && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${categoryStyle(task.category)}`}>
                {task.category}
              </span>
            )}
            {task.is_repeat ? (
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Repeat · {task.repeat_days?.split(',').map(d => DAYS[+d]?.label).join(' ')}
              </span>
            ) : null}
            {task.template_name && (
              <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg border border-orange-200">
                {task.template_name}
              </span>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 shrink-0 text-orange-500" />
            <span className="truncate">{task.assignee_name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <User className="w-4 h-4 shrink-0 text-gray-300" />
            <span className="truncate">by {task.assigner_name}</span>
          </div>
          {task.deadline && (
            <div className={`flex items-center gap-2 col-span-2 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              {isOverdue ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0 text-orange-500" />}
              <span>{format(parseISO(task.deadline), 'dd MMM yyyy, hh:mm a')}</span>
              {isOverdue && <span className="text-xs text-red-500 font-semibold">OVERDUE</span>}
            </div>
          )}
          {task.proof_required && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <Camera className="w-4 h-4 shrink-0" />
              <span>Photo proof required</span>
            </div>
          )}
        </div>

        {/* Status action */}
        {canUpdate && nextStatus && task.status !== 'done' && (
          nextStatus === 'done' ? (
            showCompleteForm ? (
              <form onSubmit={handleCompleteSubmit} className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Complete — {settings.stage_3_name}
                  {task.proof_required && <span className="text-xs text-amber-600 font-normal">(photo required)</span>}
                </p>
                {completePreview ? (
                  <div className="relative inline-block">
                    <img src={completePreview} alt="proof" className="h-28 rounded-xl object-cover border border-gray-200" />
                    <button type="button" onClick={() => { setCompleteFile(null); setCompletePreview(null); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => completeFileRef.current.click()}
                    className={`btn-ghost flex items-center gap-2 w-full justify-center ${task.proof_required ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : ''}`}>
                    <Camera className="w-4 h-4" />
                    {task.proof_required ? 'Upload Proof Photo *' : 'Add Photo (optional)'}
                  </button>
                )}
                <input ref={completeFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCompleteFile} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowCompleteForm(false); setCompleteFile(null); setCompletePreview(null); }}
                    className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? 'Saving...' : 'Confirm Complete'}
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowCompleteForm(true)} className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                Mark as {settings.stage_3_name}
              </button>
            )
          ) : (
            <button onClick={() => moveStatus(nextStatus)} disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Move to {STATUS_LABELS[nextStatus]}
            </button>
          )
        )}
      </div>

      {/* Update form */}
      {canUpdate && task.status !== 'done' && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-orange-500" />
            Add Update
          </h3>
          <form onSubmit={handleUpdate} className="space-y-3">
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Add a note about your progress..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {preview && (
              <div className="relative inline-block">
                <img src={preview} alt="preview" className="h-32 rounded-xl object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center"
                >×</button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="btn-ghost flex items-center gap-2 flex-1"
              >
                <Camera className="w-4 h-4" />
                {file ? 'Change Photo' : 'Add Photo'}
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 flex-1">
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Update'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </form>
        </div>
      )}

      {/* Update history */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-500" />
          Activity ({task.updates?.length || 0})
        </h3>
        <div className="space-y-4">
          {task.updates?.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No updates yet</p>
          )}
          {task.updates?.slice().reverse().map((u) => (
            <div key={u.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0 mt-0.5">
                {u.user_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{u.user_name}</span>
                  {u.old_status !== u.new_status && u.new_status && (
                    <span className="text-xs text-gray-400">
                      → <span className={STATUS_COLORS[u.new_status] || 'text-gray-600'}>{STATUS_LABELS[u.new_status] || u.new_status}</span>
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {format(parseISO(u.created_at), 'dd MMM, hh:mm a')}
                  </span>
                </div>
                {u.note && <p className="text-sm text-gray-600 mt-1">{u.note}</p>}
                {u.image_path && (
                  <a href={`/${u.image_path}`} target="_blank" rel="noopener noreferrer">
                    <img
                      src={`/${u.image_path}`}
                      alt="proof"
                      className="mt-2 max-h-48 rounded-xl object-cover border border-gray-200 hover:border-orange-300 transition-all"
                    />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
