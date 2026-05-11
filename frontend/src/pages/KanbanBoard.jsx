import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import {
  Plus, ChevronDown, Search, Trash2,
  ExternalLink, Camera, AlertTriangle, Check, RefreshCw
} from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { categoryStyle } from '../config/categories';

const GROUP_CONFIG = {
  todo:  { dot: 'bg-gray-400',     header: 'bg-gray-50',      pill: 'bg-gray-100 text-gray-700',        pillHover: 'hover:bg-gray-200' },
  doing: { dot: 'bg-blue-500',     header: 'bg-blue-50',      pill: 'bg-blue-100 text-blue-700',        pillHover: 'hover:bg-blue-200' },
  done:  { dot: 'bg-emerald-500',  header: 'bg-emerald-50',   pill: 'bg-emerald-100 text-emerald-700',  pillHover: 'hover:bg-emerald-200' },
};

function StatusPill({ task, labels, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const c = GROUP_CONFIG[task.status] || GROUP_CONFIG.todo;

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${c.pill} ${c.pillHover}`}
      >
        {labels[task.status] || task.status}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-44">
          {Object.entries(labels).map(([status, label]) => {
            const cc = GROUP_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => { onStatusChange(task, status); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-700"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cc.dot}`} />
                <span className={status === task.status ? 'font-semibold' : ''}>{label}</span>
                {status === task.status && <Check className="ml-auto w-3.5 h-3.5 text-orange-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, labels, onStatusChange, onDelete, isAdmin }) {
  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'done';
  const stripe = GROUP_CONFIG[task.status]?.dot || 'bg-gray-300';

  return (
    <div className="group flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors min-h-[52px]">
      {/* colored left stripe */}
      <div className={`w-1 self-stretch shrink-0 opacity-50 ${stripe}`} />

      {/* Task name */}
      <div className="flex-1 min-w-0 px-4 py-3">
        <Link
          to={`/tasks/${task.id}`}
          className="text-sm font-medium text-gray-900 hover:text-orange-500 transition-colors leading-snug block truncate"
        >
          {task.title}
        </Link>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.category && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${categoryStyle(task.category)}`}>
              {task.category}
            </span>
          )}
          {task.is_repeat ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-medium">
              <RefreshCw className="w-2.5 h-2.5" /> Repeat
            </span>
          ) : null}
          {task.proof_required && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
              <Camera className="w-3 h-3" /> Proof
            </span>
          )}
          {task.template_name && (
            <span className="text-[10px] text-gray-400">{task.template_name}</span>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="hidden sm:flex items-center gap-2 w-40 px-3 py-3 shrink-0">
        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
          {task.assignee_name?.[0]?.toUpperCase()}
        </div>
        <span className="text-xs text-gray-600 truncate">{task.assignee_name}</span>
      </div>

      {/* Due date */}
      <div className="hidden md:flex items-center w-36 px-3 py-3 shrink-0">
        {task.deadline ? (
          <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {isOverdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
            {formatDistanceToNow(parseISO(task.deadline), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-xs text-gray-300">No deadline</span>
        )}
      </div>

      {/* Status pill */}
      <div className="flex items-center w-36 px-3 py-3 shrink-0">
        <StatusPill task={task} labels={labels} onStatusChange={onStatusChange} />
      </div>

      {/* Row actions — fade in on hover */}
      <div className="flex items-center gap-0.5 w-16 px-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          to={`/tasks/${task.id}`}
          className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
          title="Open task"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        {isAdmin && (
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TaskGroup({ status, label, tasks, labels, onStatusChange, onDelete, isAdmin }) {
  const [collapsed, setCollapsed] = useState(false);
  const c = GROUP_CONFIG[status];

  return (
    <div className="card overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${c.header} border-b border-gray-100 hover:brightness-[0.97] transition-all text-left`}
      >
        <span className={`w-3 h-3 rounded-sm shrink-0 ${c.dot}`} />
        <span className="font-bold text-gray-800 text-sm">{label}</span>
        <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
        <ChevronDown
          className={`ml-auto w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <>
          {/* Column headers */}
          {tasks.length > 0 && (
            <div className="flex items-center bg-white border-b border-gray-100 py-1.5">
              <div className="w-1 shrink-0" />
              <div className="flex-1 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Task Name</div>
              <div className="hidden sm:block w-40 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Assignee</div>
              <div className="hidden md:block w-36 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Due Date</div>
              <div className="w-36 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</div>
              <div className="w-16 px-2" />
            </div>
          )}

          {/* Rows */}
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              labels={labels}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              isAdmin={isAdmin}
            />
          ))}

          {tasks.length === 0 && (
            <div className="flex items-center justify-center py-10 text-gray-300 text-sm">
              No tasks here
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const STATUS_LABELS = {
    todo:  settings.stage_1_name,
    doing: settings.stage_2_name,
    done:  settings.stage_3_name,
  };

  const GROUPS = [
    { status: 'todo',  label: settings.stage_1_name },
    { status: 'doing', label: settings.stage_2_name },
    { status: 'done',  label: settings.stage_3_name },
  ];

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  async function load() {
    try {
      const params = filterUser ? { assigned_to: filterUser } : {};
      const [taskRes, userRes, catRes] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/users'),
        api.get('/categories'),
      ]);
      setTasks(taskRes.data);
      setUsers(userRes.data.filter(u => u.role === 'staff'));
      setCategories(catRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterUser]);

  async function handleStatusChange(task, newStatus) {
    if (task.status === newStatus) return;
    if (task.proof_required && newStatus === 'done') {
      navigate(`/tasks/${task.id}`);
      toast('Open task to complete with photo', { icon: '📸' });
      return;
    }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      const form = new FormData();
      form.append('status', newStatus);
      await api.patch(`/tasks/${task.id}/status`, form);
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
    } catch {
      toast.error('Failed to update');
      load();
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    toast.success('Deleted');
    load();
  }

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.assignee_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm">{tasks.length} tasks · {filtered.length} shown</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 py-2 text-sm"
            placeholder="Search tasks or assignee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="input py-2 text-sm w-36"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {isAdmin && (
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="input py-2 text-sm w-40"
          >
            <option value="">All Staff</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* Task groups */}
      <div className="space-y-3">
        {GROUPS.map(g => (
          <TaskGroup
            key={g.status}
            status={g.status}
            label={g.label}
            tasks={filtered.filter(t => t.status === g.status)}
            labels={STATUS_LABELS}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-gray-400">No tasks yet. Create your first one!</p>
        </div>
      )}

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
