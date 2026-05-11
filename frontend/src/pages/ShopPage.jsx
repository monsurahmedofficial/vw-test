import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns';
import {
  Store, Clock, Users, ChevronLeft, ChevronRight,
  Zap, Moon, AlertTriangle, Check, X, Edit2
} from 'lucide-react';

function fmt(iso) {
  return format(parseISO(iso), 'hh:mm a');
}

function elapsed(from) {
  if (!from) return null;
  const mins = differenceInMinutes(new Date(), parseISO(from));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function dayProgress(openedAt, closedAt, openTime, closeTime) {
  const now = new Date();
  const base = openedAt ? parseISO(openedAt) : now;
  const [oh, om] = (openTime || '09:00').split(':').map(Number);
  const [ch, cm] = (closeTime || '22:00').split(':').map(Number);
  const dayStart = new Date(base); dayStart.setHours(oh, om, 0, 0);
  const dayEnd = new Date(base); dayEnd.setHours(ch, cm, 0, 0);
  const total = differenceInSeconds(dayEnd, dayStart);
  const current = differenceInSeconds(closedAt ? parseISO(closedAt) : now, dayStart);
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

function OverrideModal({ shop, onClose, onDone }) {
  const [action, setAction] = useState(shop.is_open ? 'close' : 'open');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.post(`/shops/${shop.id}/override`, { is_open: action === 'open', reason });
      toast.success(`${shop.name} marked ${action === 'open' ? 'Open' : 'Closed'}`);
      onDone();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Manual Override</p>
            <h3 className="font-semibold text-gray-900 mt-0.5">{shop.name}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAction('open')}
              className={`py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 transition-all ${
                action === 'open' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-300'
              }`}>
              <Zap className="w-4 h-4" /> Open
            </button>
            <button onClick={() => setAction('close')}
              className={`py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 transition-all ${
                action === 'close' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:border-slate-300'
              }`}>
              <Moon className="w-4 h-4" /> Closed
            </button>
          </div>
          <div>
            <label className="label">Reason <span className="text-gray-300">(optional)</span></label>
            <input className="input" placeholder="e.g. Early opening today" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopCard({ shop, isToday, isManager, onOverride }) {
  const log = shop.log;
  const isOpen = log?.is_open === 1;
  const staff = shop.attendance || shop.checked_in_staff || [];
  const progress = log?.opened_at
    ? dayProgress(log.opened_at, log.closed_at, shop.default_open_time, shop.default_close_time)
    : 0;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${
      isOpen ? 'border-emerald-200' : 'border-gray-200'
    }`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isOpen ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gray-200'}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isOpen ? 'bg-emerald-50' : 'bg-gray-100'
            }`}>
              <Store className={`w-5 h-5 ${isOpen ? 'text-emerald-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{shop.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {shop.default_open_time} – {shop.default_close_time}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            isOpen
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {isOpen ? '● OPEN' : '○ CLOSED'}
          </div>
        </div>

        {/* Timeline */}
        {log?.opened_at ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Opened {fmt(log.opened_at)}</span>
              </div>
              {log.closed_at ? (
                <div className="flex items-center gap-1.5">
                  <span>Closed {fmt(log.closed_at)}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                </div>
              ) : isOpen && isToday ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {elapsed(log.opened_at)}
                </span>
              ) : null}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOpen ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gray-300'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <div className="h-1.5 bg-gray-100 rounded-full flex-1" />
            <span className="text-xs text-gray-300">No activity yet</span>
            <div className="h-1.5 bg-gray-100 rounded-full flex-1" />
          </div>
        )}

        {/* Manual override note */}
        {log?.is_manual_override ? (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Manual override{log.override_reason ? ` — ${log.override_reason}` : ''}</span>
          </div>
        ) : null}

        {/* Staff */}
        {staff.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {isToday ? 'Staff In' : 'Attended'} · {staff.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {staff.map((a, i) => {
                const name = a.user_name || a.name || '';
                return (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-600">
                    <div className="w-5 h-5 rounded-md bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                      {name[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium">{name.split(' ')[0]}</span>
                    {(a.since || a.check_in_at) && (
                      <span className="text-gray-400">{fmt(a.since || a.check_in_at)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Override button */}
        {isManager && isToday && (
          <button
            onClick={() => onOverride(shop)}
            className="w-full mt-1 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 hover:border-gray-300 flex items-center justify-center gap-1.5 transition-all"
          >
            <Edit2 className="w-3 h-3" /> Override Status
          </button>
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'hr'].includes(user?.role);
  const [shops, setShops] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [overriding, setOverriding] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = date === todayStr;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = isManager
        ? await api.get('/shops/logs', { params: { date } })
        : await api.get('/shops', { params: { date } });
      setShops(data);
    } finally { setLoading(false); }
  }, [date, isManager]);

  useEffect(() => { load(); }, [load]);

  function shiftDate(days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayStr) setDate(next);
  }

  const openCount = shops.filter(s => s.log?.is_open === 1).length;
  const closedCount = shops.length - openCount;
  const totalStaff = shops.reduce((sum, s) => {
    const staff = s.attendance || s.checked_in_staff || [];
    return sum + staff.length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Status</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isToday ? 'Today\'s operations' : format(parseISO(date), 'EEEE, dd MMM yyyy')}
          </p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => shiftDate(-1)} className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            className="text-sm font-medium text-gray-700 border-none outline-none bg-transparent px-1 text-center"
            value={date}
            max={todayStr}
            onChange={e => setDate(e.target.value)}
          />
          <button
            onClick={() => shiftDate(1)}
            disabled={isToday}
            className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-500 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary pills */}
      {shops.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {openCount} Open
          </div>
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            {closedCount} Closed
          </div>
          {totalStaff > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 px-4 py-2 rounded-xl text-sm font-semibold">
              <Users className="w-3.5 h-3.5" />
              {totalStaff} staff in
            </div>
          )}
          {!isToday && (
            <button onClick={() => setDate(todayStr)} className="ml-auto text-xs text-orange-500 hover:text-orange-600 font-medium">
              ← Back to today
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && shops.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Store className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No shops configured</p>
          <p className="text-gray-400 text-sm mt-1">Go to Settings → Shops to add your branches</p>
        </div>
      )}

      {/* Cards */}
      {!loading && shops.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(s => (
            <ShopCard
              key={s.id}
              shop={s}
              isToday={isToday}
              isManager={isManager}
              onOverride={setOverriding}
            />
          ))}
        </div>
      )}

      {overriding && (
        <OverrideModal
          shop={overriding}
          onClose={() => setOverriding(null)}
          onDone={() => { setOverriding(null); load(); }}
        />
      )}
    </div>
  );
}
