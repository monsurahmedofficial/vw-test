import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInMinutes, addDays } from 'date-fns';
import { LogIn, LogOut, Store, Check, UserCheck, UserX } from 'lucide-react';

function dur(from) {
  if (!from) return '-';
  const mins = differenceInMinutes(new Date(), parseISO(from));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function spanDuration(from, to) {
  if (!from || !to) return '-';
  const mins = differenceInMinutes(parseISO(to), parseISO(from));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function ShopPrompt({ title, message, onYes, onNo }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto">
          <Store className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onNo} className="btn-ghost flex-1">Skip</button>
          <button onClick={onYes} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Yes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isManager = ['admin', 'hr'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  const [record, setRecord] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [board, setBoard] = useState([]);
  const [todayRosters, setTodayRosters] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shopPrompt, setShopPrompt] = useState(null);

  async function load() {
    try {
      const requests = [
        api.get('/attendance/today'),
        api.get('/shops'),
        api.get('/rosters/today'),
      ];
      if (isManager) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        requests.push(api.get('/attendance/board'));
        requests.push(api.get('/users'));
        requests.push(api.get(`/rosters?start_date=${today}&end_date=${tomorrow}`));
      }

      const [statusRes, shopsRes, rosterRes, boardRes, usersRes, rostersRes] = await Promise.all(requests);
      setRecord(statusRes.data.record);
      setShops(shopsRes.data);

      const roster = rosterRes.data.roster;
      if (roster && !statusRes.data.record) setSelectedShop(String(roster.shop_id));

      if (isManager) {
        setBoard(boardRes?.data || []);
        setAllStaff((usersRes?.data || []).filter(u => u.role === 'staff' && u.is_active));
        setTodayRosters(rostersRes?.data || []);
      }
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function doCheckIn(openShop) {
    setShopPrompt(null);
    setSubmitting(true);
    try {
      await api.post('/attendance/checkin', { shop_id: selectedShop, open_shop: openShop });
      toast.success('Checked in');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    if (!selectedShop) return toast.error('Select a branch');
    const alreadyOpen = shops.find(s => s.id === +selectedShop)?.is_open;
    alreadyOpen ? doCheckIn(false) : setShopPrompt({ type: 'open' });
  }

  async function doCheckOut(closeShop) {
    setShopPrompt(null);
    setSubmitting(true);
    try {
      await api.post('/attendance/checkout', { close_shop: closeShop });
      toast.success('Checked out');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isCheckedIn = record && !record.check_out_at;
  const assignedShop = selectedShop ? shops.find(s => s.id === +selectedShop) : null;

  const attByUser = {};
  board.forEach(a => {
    if (!attByUser[a.user_id]) attByUser[a.user_id] = [];
    attByUser[a.user_id].push(a);
  });

  const rosterByUser = {};
  todayRosters.forEach(r => { rosterByUser[r.user_id] = r; });

  const staffRows = allStaff.map(staff => {
    const records = attByUser[staff.id] || [];
    const active = records.find(r => !r.check_out_at);
    const last = records[records.length - 1];
    const status = active ? 'in' : last ? 'out' : 'absent';
    return { ...staff, status, rec: active || last || null, roster: rosterByUser[staff.id] || null };
  });

  const presentCount = staffRows.filter(s => s.status === 'in').length;
  const rosteredCount = staffRows.filter(s => s.roster).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        </div>

        {!isAdmin ? (
          <div className="flex items-center gap-2">
            {isCheckedIn ? (
              <>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-sm font-medium text-emerald-700">{record.shop_name}</span>
                  <span className="text-xs text-emerald-500 border-l border-emerald-200 pl-2">
                    {format(parseISO(record.check_in_at), 'hh:mm a')} - {dur(record.check_in_at)}
                  </span>
                </div>
                <button
                  onClick={() => setShopPrompt({ type: 'close' })}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Check Out
                </button>
              </>
            ) : assignedShop ? (
              <form onSubmit={handleCheckIn} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                  <Store className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-700">{assignedShop.name}</span>
                </div>
                <button type="submit" disabled={submitting}
                  className="btn-primary flex items-center gap-1.5 py-2 whitespace-nowrap">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <LogIn className="w-3.5 h-3.5" />}
                  Check In
                </button>
              </form>
            ) : (
              <form onSubmit={handleCheckIn} className="flex items-center gap-2">
                <select
                  className="input py-2 text-sm w-44"
                  value={selectedShop}
                  onChange={e => setSelectedShop(e.target.value)}
                  required
                >
                  <option value="">Select branch</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="submit" disabled={submitting}
                  className="btn-primary flex items-center gap-1.5 py-2 whitespace-nowrap">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <LogIn className="w-3.5 h-3.5" />}
                  Check In
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
            <UserCheck className="w-4 h-4 text-orange-500" />
            Employee attendance management
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500">Present Now</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{presentCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500">Rostered Today</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{rosteredCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500">Absent / Out</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{staffRows.length - presentCount}</p>
          </div>
        </div>
      )}

      {isManager && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{isAdmin ? 'Employee Attendance Board' : "Today's Roster"}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />{presentCount} present
              </span>
              <span className="flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-red-400" />{staffRows.length - presentCount} absent/out
              </span>
            </div>
          </div>

          {staffRows.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No staff members found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-2">Staff</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Branch</th>
                  <th className="text-center px-3 py-2">In</th>
                  <th className="text-center px-3 py-2 hidden sm:table-cell">Out</th>
                  <th className="text-center px-3 py-2 hidden md:table-cell">Duration</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffRows.map(staff => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          staff.status === 'in' ? 'bg-emerald-100 text-emerald-700' :
                          staff.status === 'out' ? 'bg-gray-100 text-gray-500' :
                          'bg-red-50 text-red-400'
                        }`}>
                          {staff.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 truncate">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                      {staff.rec?.shop_name || staff.roster?.shop_name || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-600">
                      {staff.rec?.check_in_at ? format(parseISO(staff.rec.check_in_at), 'hh:mm a') : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-600 hidden sm:table-cell">
                      {staff.rec?.check_out_at ? format(parseISO(staff.rec.check_out_at), 'hh:mm a') : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-600 hidden md:table-cell">
                      {staff.status === 'in' && staff.rec?.check_in_at
                        ? dur(staff.rec.check_in_at)
                        : staff.status === 'out'
                          ? spanDuration(staff.rec?.check_in_at, staff.rec?.check_out_at)
                          : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        staff.status === 'in' ? 'bg-emerald-100 text-emerald-700' :
                        staff.status === 'out' ? 'bg-gray-100 text-gray-500' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {staff.status === 'in' ? 'IN' : staff.status === 'out' ? 'OUT' : 'ABSENT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {shopPrompt?.type === 'open' && (
        <ShopPrompt
          title="Open the shop?"
          message="No open record is active for this branch yet. Mark it as open with your check-in?"
          onYes={() => doCheckIn(true)}
          onNo={() => doCheckIn(false)}
        />
      )}
      {shopPrompt?.type === 'close' && (
        <ShopPrompt
          title="Close the shop?"
          message="Mark this shop as closed when checking out?"
          onYes={() => doCheckOut(true)}
          onNo={() => doCheckOut(false)}
        />
      )}
    </div>
  );
}
