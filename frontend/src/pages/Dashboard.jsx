import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useSettings } from '../contexts/SettingsContext';
import { formatDistanceToNow, isPast, parseISO, differenceInMinutes, format } from 'date-fns';
import {
  Clock, Zap, CheckCircle2, AlertTriangle,
  Store, Users, ArrowRight, Plus, TrendingUp, UserCheck, UserX
} from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';

function elapsed(isoStr) {
  const mins = differenceInMinutes(new Date(), parseISO(isoStr));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function statusBadge(status) {
  return { todo: 'badge-todo', doing: 'badge-doing', done: 'badge-done' }[status] || 'badge-todo';
}

function TaskStatCard({ label, value, pct, accentBorder, barColor, iconBg, iconColor, icon: Icon }) {
  return (
    <div className={`card p-5 border-t-[3px] ${accentBorder}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-900 leading-none">{value ?? 0}</p>
      <div className="mt-4 space-y-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400">{pct}% of all tasks</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { settings } = useSettings();
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    try {
      const [statsRes, shopsRes, attRes] = await Promise.all([
        api.get('/tasks/stats/dashboard'),
        api.get('/shops/logs'),
        api.get('/attendance/board'),
      ]);
      setStats(statsRes.data);
      setShops(shopsRes.data);
      setAttendance(attRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const o = stats?.overall || {};
  const total = o.total || 0;
  const pct = (n) => total > 0 ? Math.round(((n || 0) / total) * 100) : 0;

  // Map attendance records per user
  const attByUser = {};
  attendance.forEach(a => {
    if (!attByUser[a.user_id]) attByUser[a.user_id] = [];
    attByUser[a.user_id].push(a);
  });

  const staffRows = (stats?.byStaff || []).map(s => {
    const records = attByUser[s.id] || [];
    const active = records.find(r => !r.check_out_at);
    const last = records[records.length - 1];
    const status = active ? 'in' : last ? 'out' : 'absent';
    return { ...s, status, record: active || last || null };
  });

  const presentCount = staffRows.filter(s => s.status === 'in').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Operations overview · {format(new Date(), 'EEEE, dd MMM')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Assign Task</span>
        </button>
      </div>

      {/* ── Section 1: Task Status ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TaskStatCard
          label={settings.stage_1_name || 'Pending'}
          value={o.todo} pct={pct(o.todo)}
          accentBorder="border-t-orange-400" barColor="bg-orange-400"
          iconBg="bg-orange-50" iconColor="text-orange-500" icon={Clock}
        />
        <TaskStatCard
          label={settings.stage_2_name || 'Processing'}
          value={o.doing} pct={pct(o.doing)}
          accentBorder="border-t-blue-400" barColor="bg-blue-400"
          iconBg="bg-blue-50" iconColor="text-blue-500" icon={Zap}
        />
        <TaskStatCard
          label={settings.stage_3_name || 'Completed'}
          value={o.done} pct={pct(o.done)}
          accentBorder="border-t-emerald-400" barColor="bg-emerald-400"
          iconBg="bg-emerald-50" iconColor="text-emerald-500" icon={CheckCircle2}
        />
        <TaskStatCard
          label="Overdue"
          value={o.overdue} pct={pct(o.overdue)}
          accentBorder="border-t-red-400" barColor="bg-red-400"
          iconBg="bg-red-50" iconColor="text-red-500" icon={AlertTriangle}
        />
      </div>

      {/* ── Section 2: Shop Insights ── */}
      {shops.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-500" /> Shop Insights
            </h2>
            <Link to="/shop" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
              Full view <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map(s => {
              const isOpen = s.log?.is_open === 1;
              const staffIn = (s.attendance || []).filter(a => !a.check_out_at);
              return (
                <Link key={s.id} to="/shop"
                  className={`card p-4 hover:shadow-md transition-all group border-l-4 ${
                    isOpen ? 'border-l-emerald-400' : 'border-l-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOpen ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                        <Store className={`w-4 h-4 ${isOpen ? 'text-emerald-500' : 'text-gray-400'}`} />
                      </div>
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-orange-500 transition-colors">{s.name}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {isOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500">
                    {s.log?.opened_at ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Opened {format(parseISO(s.log.opened_at), 'hh:mm a')}</span>
                        {isOpen && (
                          <span className="ml-auto font-semibold text-emerald-600">{elapsed(s.log.opened_at)} open</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-300 italic text-[11px]">No activity today</p>
                    )}
                    {s.log?.closed_at && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                        <span>Closed {format(parseISO(s.log.closed_at), 'hh:mm a')}</span>
                      </div>
                    )}
                  </div>

                  {staffIn.length > 0 && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                      <div className="flex">
                        {staffIn.slice(0, 5).map((a, i) => (
                          <div key={i}
                            className="w-6 h-6 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-orange-600"
                            style={{ marginLeft: i > 0 ? '-5px' : 0 }}>
                            {(a.user_name || '?')[0].toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-400 ml-1.5">
                        {staffIn.length} staff in
                        {staffIn.length > 5 && ` (+${staffIn.length - 5})`}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Attendance + Recent Tasks ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Attendance Overview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" /> Attendance Today
            </h2>
            <Link to="/attendance" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
              Full view <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {staffRows.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No staff members yet</p>
          ) : (
            <>
              <div className="space-y-1">
                {staffRows.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-2 rounded-xl px-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      s.status === 'in'     ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'out'   ? 'bg-gray-100 text-gray-500' :
                                             'bg-red-50 text-red-400'
                    }`}>
                      {s.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {s.status === 'in' && s.record?.check_in_at &&
                          `In since ${format(parseISO(s.record.check_in_at), 'hh:mm a')}${s.record.shop_name ? ` · ${s.record.shop_name}` : ''}`}
                        {s.status === 'out' && s.record?.check_out_at &&
                          `Left at ${format(parseISO(s.record.check_out_at), 'hh:mm a')}`}
                        {s.status === 'absent' && 'Not checked in today'}
                      </p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      s.status === 'in'   ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'out'  ? 'bg-gray-100 text-gray-500' :
                                            'bg-red-50 text-red-500'
                    }`}>
                      {s.status === 'in' ? '● IN' : s.status === 'out' ? '○ OUT' : '— ABSENT'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {presentCount} present
                </span>
                <span className="flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-red-400" />
                  {staffRows.length - presentCount} absent / out
                </span>
              </div>
            </>
          )}
        </div>

        {/* Recent Task Insights */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" /> Recent Task Insights
            </h2>
            <Link to="/board" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
              View board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats?.recent?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No tasks yet</p>
          ) : (
            <div className="space-y-0.5">
              {stats?.recent?.map(t => {
                const overdue = t.deadline && isPast(parseISO(t.deadline)) && t.status !== 'done';
                return (
                  <Link key={t.id} to={`/tasks/${t.id}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-all group">
                    <span className={statusBadge(t.status)}>
                      {t.status === 'todo' ? (settings.stage_1_name || 'Pending') :
                       t.status === 'doing' ? (settings.stage_2_name || 'Processing') :
                       (settings.stage_3_name || 'Done')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate group-hover:text-orange-500 transition-colors font-medium">
                        {t.title}
                      </p>
                      <p className="text-[11px] text-gray-400">{t.assignee_name}</p>
                    </div>
                    {t.deadline && (
                      <span className={`text-xs shrink-0 flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        {overdue && <AlertTriangle className="w-3 h-3" />}
                        {formatDistanceToNow(parseISO(t.deadline), { addSuffix: true })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
