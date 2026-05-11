import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, Camera, ChevronRight, RefreshCw } from 'lucide-react';
import { categoryStyle } from '../config/categories';
import BrandLogo from '../components/BrandLogo';

const STATUS_COLORS = {
  todo:  { bg: 'bg-gray-100 border-gray-200',     text: 'text-gray-600',    dot: 'bg-gray-400' },
  doing: { bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-600',    dot: 'bg-blue-500' },
  done:  { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', dot: 'bg-emerald-500' },
};

function TaskItem({ task, statusLabels }) {
  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'done';
  const s = STATUS_COLORS[task.status];

  return (
    <Link
      to={`/tasks/${task.id}`}
      className="card card-hover p-4 flex items-center gap-3"
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-lg border ${s.bg} ${s.text}`}>
            {statusLabels[task.status]}
          </span>
          {task.category && (
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryStyle(task.category)}`}>
              {task.category}
            </span>
          )}
          {task.is_repeat ? (
            <span className="inline-flex items-center gap-1 text-xs text-blue-500">
              <RefreshCw className="w-3 h-3" />
            </span>
          ) : null}
          {task.deadline && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {formatDistanceToNow(parseISO(task.deadline), { addSuffix: true })}
            </span>
          )}
          {task.proof_required && (
            <Camera className={`w-3 h-3 ${task.latest_proof ? 'text-amber-500' : 'text-gray-300'}`} />
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const STATUS_LABELS = {
    todo: settings.stage_1_name,
    doing: settings.stage_2_name,
    done: settings.stage_3_name,
  };
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    api.get('/tasks').then(({ data }) => setTasks(data)).finally(() => setLoading(false));
  }, []);

  const active = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');
  const overdue = active.filter((t) => t.deadline && isPast(parseISO(t.deadline)));
  const shown = tab === 'active' ? active : done;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-lg font-bold text-white shadow-sm">
          {user.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-gray-400 text-sm">Good day,</p>
          <p className="font-bold text-gray-900 text-lg">{user.name}</p>
        </div>
        <div className="ml-auto">
          <BrandLogo size="sm" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{active.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Active</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{done.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Done</p>
        </div>
        <div className="card p-3 text-center">
          <p className={`text-2xl font-bold ${overdue.length > 0 ? 'text-red-500' : 'text-gray-300'}`}>{overdue.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Overdue</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setTab('done')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === 'done' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Completed ({done.length})
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {shown.length === 0 && (
          <div className="card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              {tab === 'active' ? 'No active tasks. Great job! 🎉' : 'No completed tasks yet'}
            </p>
          </div>
        )}
        {shown.map((t) => <TaskItem key={t.id} task={t} statusLabels={STATUS_LABELS} />)}
      </div>
    </div>
  );
}
