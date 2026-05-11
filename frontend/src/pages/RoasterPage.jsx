import { Fragment, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CalendarCheck, ChevronLeft, ChevronRight, Plus, X, Trash2, Store, Users
} from 'lucide-react';
import {
  format, startOfWeek, startOfMonth, addDays, addWeeks, subWeeks, addMonths, subMonths,
  isToday, isBefore, startOfDay, isSameMonth
} from 'date-fns';

const WEEKDAYS = [
  { value: 6, label: 'SAT' },
  { value: 0, label: 'SUN' },
  { value: 1, label: 'MON' },
  { value: 2, label: 'TUE' },
  { value: 3, label: 'WED' },
  { value: 4, label: 'THU' },
  { value: 5, label: 'FRI' },
];

function StaffAvatar({ name }) {
  return (
    <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function WeekdaySelector({ selectedWeekdays, onToggle }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map(day => {
        const selected = selectedWeekdays.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onToggle(day.value)}
            className={`h-9 rounded-lg text-[10px] font-bold transition-all ${
              selected
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-400 border border-gray-200 hover:border-orange-200 hover:text-orange-500'
            }`}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

function EmployeeRosterModal({ employee, date, shops, existingRosters, defaults, rangeStart, rangeEnd, onClose, onSave }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const existing = existingRosters.find(r => r.date === dateStr && r.user_id === employee.id);
  const employeeDefaults = defaults.filter(d => d.user_id === employee.id);

  const [selectedShop, setSelectedShop] = useState(existing?.shop_id || shops[0]?.id || '');
  const [setDefault, setSetDefault] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState([date.getDay()]);
  const [saving, setSaving] = useState(false);

  function toggleWeekday(weekday) {
    setSelectedWeekdays(prev => (
      prev.includes(weekday) ? prev.filter(day => day !== weekday) : [...prev, weekday]
    ));
  }

  async function handleSave() {
    if (!selectedShop) return toast.error('Select a branch');
    if (setDefault && selectedWeekdays.length === 0) return toast.error('Select at least one weekday');

    setSaving(true);
    try {
      if (setDefault) {
        await api.post('/rosters/defaults', {
          user_id: employee.id,
          shop_id: selectedShop,
          weekdays: selectedWeekdays,
          apply_start: format(rangeStart, 'yyyy-MM-dd'),
          apply_end: format(rangeEnd, 'yyyy-MM-dd'),
        });

        if (!selectedWeekdays.includes(date.getDay())) {
          await api.post('/rosters', { user_id: employee.id, shop_id: selectedShop, date: dateStr });
        }

        toast.success('Employee default roster saved');
      } else {
        await api.post('/rosters', { user_id: employee.id, shop_id: selectedShop, date: dateStr });
        toast.success(existing ? 'Roster updated' : 'Roster added');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save roster');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveDay() {
    try {
      await api.delete(`/rosters/by-user-date?user_id=${employee.id}&date=${dateStr}`);
      toast.success('Roster removed');
      onSave();
    } catch {
      toast.error('Failed to remove roster');
    }
  }

  async function handleRemoveDefault() {
    if (!existing) return;
    try {
      await api.delete(`/rosters/defaults?user_id=${employee.id}`);
      toast.success('Employee defaults removed');
      onSave();
    } catch {
      toast.error('Failed to remove employee defaults');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <StaffAvatar name={employee.name} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{employee.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{format(date, 'EEEE, dd MMM yyyy')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {existing && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Store className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800 truncate">{existing.shop_name}</p>
                <p className="text-[11px] text-blue-600">{existing.shift_start} - {existing.shift_end}{existing.source === 'default' ? ' - Default' : ''}</p>
              </div>
            </div>
          )}

          <div>
            <label className="label">Branch</label>
            <select className="input py-2 text-sm" value={selectedShop} onChange={e => setSelectedShop(e.target.value)}>
              <option value="">Select branch</option>
              {shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
            </select>
          </div>

          {employeeDefaults.length > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] text-emerald-700">
              Saved defaults: {employeeDefaults.map(d => `${WEEKDAYS.find(day => day.value === d.weekday)?.label || d.weekday} ${d.shop_name}`).join(', ')}
            </div>
          )}

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-sm font-semibold text-gray-900">Set default pattern</span>
                <span className="block text-[11px] text-gray-400">Use this branch every selected weekday.</span>
              </span>
              <input
                type="checkbox"
                checked={setDefault}
                onChange={e => setSetDefault(e.target.checked)}
                className="sr-only"
              />
              <span className={`relative h-6 w-11 rounded-full transition-colors ${setDefault ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${setDefault ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </span>
            </label>

            {setDefault && (
              <div className="space-y-2">
                <WeekdaySelector selectedWeekdays={selectedWeekdays} onToggle={toggleWeekday} />
                <p className="text-[11px] text-gray-400">
                  Defaults fill empty days automatically. Manual roster edits still override the default.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !selectedShop} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1.5">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {setDefault ? 'Save Default' : existing ? 'Update' : 'Add Roster'}
            </button>
          </div>

          {existing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button onClick={handleRemoveDay}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">
                <Trash2 className="w-3.5 h-3.5" />
                Remove this day
              </button>
              {existing.source === 'default' && (
                <button onClick={handleRemoveDefault}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-100">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Remove default
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BranchRosterModal({ date, shop, employees, existingRosters, defaults, rangeStart, rangeEnd, onClose, onSave }) {
  const [selectedUser, setSelectedUser] = useState('');
  const dateStr = format(date, 'yyyy-MM-dd');
  const assigned = existingRosters.filter(r => r.date === dateStr && r.shop_id === shop.id);
  const unassigned = employees.filter(e => !existingRosters.find(r => r.date === dateStr && r.user_id === e.id));
  const employee = employees.find(e => String(e.id) === String(selectedUser));

  async function handleRemoveDay(roster) {
    try {
      await api.delete(`/rosters/by-user-date?user_id=${roster.user_id}&date=${dateStr}`);
      toast.success('Roster removed');
      onSave();
    } catch {
      toast.error('Failed to remove roster');
    }
  }

  async function handleRemoveDefault(roster) {
    try {
      await api.delete(`/rosters/defaults?user_id=${roster.user_id}`);
      toast.success('Employee defaults removed');
      onSave();
    } catch {
      toast.error('Failed to remove employee defaults');
    }
  }

  if (employee) {
    return (
      <EmployeeRosterModal
        employee={employee}
        date={date}
        shops={[shop]}
        existingRosters={existingRosters}
        defaults={defaults}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">{shop.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{format(date, 'EEEE, dd MMM yyyy')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {assigned.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Assigned</p>
              {assigned.map(r => (
                <div key={r.id} className="p-2.5 bg-gray-50 rounded-xl space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(String(r.user_id))}
                    className="w-full flex items-center gap-3 text-left rounded-lg hover:bg-white transition-all"
                  >
                    <StaffAvatar name={r.user_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.user_name}</p>
                      <p className="text-[11px] text-gray-400">{r.shift_start} - {r.shift_end}{r.source === 'default' ? ' - Default' : ''}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-orange-500 px-2">Edit</span>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={() => handleRemoveDay(r)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3 h-3" />
                      Remove this day
                    </button>
                    {r.source === 'default' && (
                      <button onClick={() => handleRemoveDefault(r)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-100 bg-white px-2 py-1.5 text-[11px] font-semibold text-orange-600 hover:bg-orange-50">
                        <CalendarCheck className="w-3 h-3" />
                        Remove default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Add Employee</p>
            <select className="input py-2 text-sm" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">Select employee</option>
              {unassigned.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <p className="text-[11px] text-gray-400">After selecting an employee, you can add one day or save their default pattern.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoasterPage() {
  const [cursorDate, setCursorDate] = useState(new Date());
  const [periodMode, setPeriodMode] = useState('week');
  const [viewMode, setViewMode] = useState('branch');
  const [rosters, setRosters] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [shops, setShops] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const rangeStart = periodMode === 'week'
    ? startOfWeek(cursorDate, { weekStartsOn: 0 })
    : startOfMonth(cursorDate);
  const rangeEnd = periodMode === 'week'
    ? addDays(rangeStart, 7)
    : addMonths(rangeStart, 1);
  const days = Array.from({ length: Math.round((rangeEnd - rangeStart) / 86400000) }, (_, i) => addDays(rangeStart, i));
  const rangeStartStr = format(rangeStart, 'yyyy-MM-dd');
  const rangeEndStr = format(rangeEnd, 'yyyy-MM-dd');
  const calendarStart = startOfWeek(rangeStart, { weekStartsOn: 0 });
  const calendarEnd = addDays(startOfWeek(addDays(rangeEnd, 6), { weekStartsOn: 0 }), 7);
  const calendarDays = Array.from(
    { length: Math.round((calendarEnd - calendarStart) / 86400000) },
    (_, i) => addDays(calendarStart, i)
  );
  const calendarWeeks = Array.from(
    { length: Math.ceil(calendarDays.length / 7) },
    (_, i) => calendarDays.slice(i * 7, i * 7 + 7)
  );
  const isPastDay = d => isBefore(startOfDay(d), startOfDay(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, dRes, sRes, uRes] = await Promise.all([
        api.get(`/rosters?start_date=${rangeStartStr}&end_date=${rangeEndStr}`),
        api.get('/rosters/defaults'),
        api.get('/shops'),
        api.get('/users'),
      ]);
      setRosters(rRes.data);
      setDefaults(dRes.data);
      setShops(sRes.data);
      setEmployees(uRes.data.filter(u => u.is_active && u.role === 'staff'));
    } catch { toast.error('Failed to load roster data'); }
    finally { setLoading(false); }
  }, [rangeStartStr, rangeEndStr]);

  useEffect(() => { load(); }, [load]);

  function rosterForEmployeeDay(employeeId, date) {
    return rosters.find(r => r.user_id === employeeId && r.date === format(date, 'yyyy-MM-dd'));
  }

  function cellRosters(date, shopId) {
    return rosters.filter(r => r.date === format(date, 'yyyy-MM-dd') && r.shop_id === shopId);
  }

  const missingEmployeeDays = employees.reduce((count, employee) => (
    count + days.filter(day => !isPastDay(day) && !rosterForEmployeeDay(employee.id, day)).length
  ), 0);
  const missingBranchDays = shops.reduce((count, shop) => (
    count + days.filter(day => !isPastDay(day) && cellRosters(day, shop.id).length === 0).length
  ), 0);
  const missingCells = viewMode === 'staff' ? missingEmployeeDays : missingBranchDays;
  const employeeGroups = [
    ...shops.map(shop => ({
      id: `shop-${shop.id}`,
      name: shop.name,
      employees: employees.filter(employee => (
        rosters.some(roster => roster.user_id === employee.id && roster.shop_id === shop.id)
        || defaults.some(pattern => pattern.user_id === employee.id && pattern.shop_id === shop.id)
      )),
    })).filter(group => group.employees.length > 0),
    {
      id: 'unscheduled',
      name: 'Needs Shop Assignment',
      employees: employees.filter(employee => (
        !rosters.some(roster => roster.user_id === employee.id)
        && !defaults.some(pattern => pattern.user_id === employee.id)
      )),
    },
  ].filter(group => group.employees.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster</h1>
          <p className="text-gray-500 text-sm">Set employee rosters and default weekly patterns</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button onClick={() => setViewMode('branch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${viewMode === 'branch' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              By Branch
            </button>
            <button onClick={() => setViewMode('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${viewMode === 'staff' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              By Employee
            </button>
          </div>

          <div className="flex bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button onClick={() => setPeriodMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${periodMode === 'week' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              Week
            </button>
            <button onClick={() => setPeriodMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${periodMode === 'month' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              Month
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button onClick={() => setCursorDate(date => periodMode === 'week' ? subWeeks(date, 1) : subMonths(date, 1))}
              className="w-8 h-8 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCursorDate(new Date())}
              className="text-xs font-semibold text-orange-500 px-3 whitespace-nowrap min-w-[110px]">
              {periodMode === 'week'
                ? `${format(rangeStart, 'dd MMM')} - ${format(addDays(rangeEnd, -1), 'dd MMM')}`
                : format(rangeStart, 'MMMM yyyy')}
            </button>
            <button onClick={() => setCursorDate(date => periodMode === 'week' ? addWeeks(date, 1) : addMonths(date, 1))}
              className="w-8 h-8 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-orange-500" />
            <p className="text-xs font-semibold text-gray-500">Default Days</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{defaults.length}</p>
        </div>
        <div className={`card p-4 shadow-sm ${missingCells > 0 ? 'border-orange-200 bg-orange-50/40' : 'bg-white'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${missingCells > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
            <p className="text-xs font-semibold text-gray-500">Needs Attention</p>
          </div>
          <p className={`text-2xl font-bold mt-1 ${missingCells > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{missingCells}</p>
        </div>
        <div className="card p-4 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            {viewMode === 'staff' ? <Users className="w-4 h-4 text-blue-500" /> : <Store className="w-4 h-4 text-emerald-500" />}
            <p className="text-xs font-semibold text-gray-500">{viewMode === 'staff' ? 'Employees' : 'Branches'}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{viewMode === 'staff' ? employees.length : shops.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : viewMode === 'staff' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-44 sticky left-0 bg-gray-50">
                    Employee
                  </th>
                  {days.map(day => (
                    <th key={day.toISOString()}
                      className={`text-center px-2 py-2 text-xs font-semibold min-w-[92px] ${isToday(day) ? 'text-orange-600 bg-orange-50' : isPastDay(day) ? 'text-gray-300' : 'text-gray-500'}`}>
                      <div className="uppercase tracking-wide">{format(day, 'EEE')}</div>
                      <div className={`text-base font-bold leading-tight mt-0.5 ${isToday(day) ? 'text-orange-500' : isPastDay(day) ? 'text-gray-300' : 'text-gray-800'}`}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employeeGroups.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No active employees found</td></tr>
                )}
                {employeeGroups.map(group => (
                  <Fragment key={group.id}>
                    <tr key={`${group.id}-header`} className="bg-gray-50/70">
                      <td colSpan={8} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                        {group.name}
                      </td>
                    </tr>
                    {group.employees.map(employee => (
                      <tr key={`${group.id}-${employee.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 sticky left-0 bg-white">
                          <div className="flex items-center gap-2">
                            <StaffAvatar name={employee.name} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{employee.name}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{employee.role}</p>
                            </div>
                          </div>
                        </td>
                        {days.map(day => {
                          const roster = rosterForEmployeeDay(employee.id, day);
                          const past = isPastDay(day);
                          const needsAttention = !past && !roster;
                          return (
                            <td key={day.toISOString()} className={`px-1.5 py-2 align-top ${isToday(day) ? 'bg-orange-50/40' : ''}`}>
                              <button
                                disabled={past}
                                onClick={() => setModal({ type: 'employee', employee, date: day })}
                                className={`w-full min-h-[54px] rounded-xl p-2 text-left transition-all ${
                                  roster
                                    ? roster.source === 'default'
                                      ? 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100'
                                      : 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                                    : needsAttention
                                      ? 'bg-orange-50 border border-orange-100 hover:bg-orange-100'
                                      : 'border border-dashed border-gray-100 text-gray-200'
                                } ${past ? 'opacity-60 cursor-default' : ''}`}
                              >
                                {roster ? (
                                  <>
                                    <p className={`text-[11px] font-bold truncate ${roster.source === 'default' ? 'text-emerald-700' : 'text-blue-700'}`}>{roster.shop_name}</p>
                                    <p className={`text-[10px] ${roster.source === 'default' ? 'text-emerald-600' : 'text-blue-600'}`}>{roster.shift_start} - {roster.shift_end}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">{roster.source === 'default' ? 'Default' : 'Manual'}</p>
                                  </>
                                ) : needsAttention ? (
                                  <span className="flex items-center justify-center gap-1 text-[10px] font-semibold text-orange-500">
                                    <AlertTriangle className="w-3 h-3" /> Add
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center text-xs">-</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : periodMode === 'month' && viewMode === 'branch' ? (
        <div className="card overflow-hidden shadow-sm border-gray-200 bg-white">
          <div className="grid grid-cols-7 gap-2 px-3 pt-3 pb-2 bg-white">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">
                {day}
              </div>
            ))}
          </div>
          <div className="space-y-2 bg-gray-50/70 p-3 pt-0">
            {calendarWeeks.map((week, index) => (
              <div key={index} className="grid grid-cols-7 gap-2">
                {week.map(day => {
                  const muted = !isSameMonth(day, rangeStart);
                  const past = isPastDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[134px] p-2 rounded-2xl border transition-all relative ${
                        muted
                          ? 'bg-white/50 border-gray-100 opacity-50'
                          : isToday(day)
                            ? 'bg-white border-orange-300 ring-2 ring-orange-200 shadow-md z-10'
                            : 'bg-white border-gray-200 shadow-sm hover:border-sky-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${isToday(day) ? 'bg-orange-500 text-white' : muted ? 'text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                          {format(day, 'd')}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {shops.map(shop => {
                          const assigned = cellRosters(day, shop.id);
                          const needsAttention = !muted && !past && assigned.length === 0;
                          return (
                            <div key={shop.id} className={`rounded-xl border px-2 py-1.5 transition-colors ${needsAttention ? 'border-orange-200 bg-orange-50/70' : 'border-gray-100 bg-gray-50/80'}`}>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <p className="text-[10px] font-bold text-gray-700 truncate">{shop.name}</p>
                                {!muted && !past && (
                                  <button
                                    onClick={() => setModal({ type: 'branch', date: day, shop })}
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${needsAttention ? 'text-orange-500 bg-white shadow-sm' : 'text-gray-300 hover:text-orange-400 hover:bg-gray-50'}`}
                                  >
                                    {needsAttention ? <AlertTriangle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {assigned.map(r => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                      const employee = employees.find(e => e.id === r.user_id);
                                      if (employee) setModal({ type: 'employee', employee, date: day });
                                    }}
                                    className={`max-w-[76px] rounded-md px-1.5 py-0.5 text-[9px] font-bold truncate transition-transform hover:scale-[1.03] ${
                                      r.source === 'default'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {r.user_name?.split(' ')[0]}
                                  </button>
                                ))}
                                {!muted && !past && assigned.length === 0 && (
                                  <span className="text-[9px] text-orange-400">Needs attention</span>
                                )}
                                {(muted || past) && assigned.length === 0 && (
                                  <span className="text-[9px] text-gray-300">-</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-36 sticky left-0 bg-gray-50">
                    Branch
                  </th>
                  {days.map(day => (
                    <th key={day.toISOString()}
                      className={`text-center px-2 py-2 text-xs font-semibold min-w-[82px] ${isToday(day) ? 'text-orange-600 bg-orange-50' : isPastDay(day) ? 'text-gray-300' : 'text-gray-500'}`}>
                      <div className="uppercase tracking-wide">{format(day, 'EEE')}</div>
                      <div className={`text-base font-bold leading-tight mt-0.5 ${isToday(day) ? 'text-orange-500' : isPastDay(day) ? 'text-gray-300' : 'text-gray-800'}`}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shops.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No shops found</td></tr>
                )}
                {shops.map(shop => (
                  <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm truncate">{shop.name}</span>
                      </div>
                    </td>
                    {days.map(day => {
                      const assigned = cellRosters(day, shop.id);
                      const past = isPastDay(day);
                      const needsAttention = !past && assigned.length === 0;
                      return (
                        <td key={day.toISOString()} className={`px-1.5 py-2 align-top ${isToday(day) ? 'bg-orange-50/40' : ''}`}>
                          <div className={`flex flex-col gap-1 min-h-[48px] rounded-xl p-1 ${needsAttention ? 'bg-orange-50/60 ring-1 ring-orange-100' : ''}`}>
                            {assigned.map(r => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  const employee = employees.find(e => e.id === r.user_id);
                                  if (employee) setModal({ type: 'employee', employee, date: day });
                                }}
                                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border text-left transition-all hover:shadow-sm ${
                                r.source === 'default' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
                              }`}>
                                <StaffAvatar name={r.user_name} />
                                <p className={`text-[10px] font-medium truncate ${r.source === 'default' ? 'text-emerald-700' : 'text-blue-700'}`}>{r.user_name?.split(' ')[0]}</p>
                              </button>
                            ))}
                            {!past && (
                              <button
                                onClick={() => setModal({ type: 'branch', date: day, shop })}
                                className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border border-dashed transition-all text-[10px] ${
                                  needsAttention ? 'border-orange-200 bg-white text-orange-500 hover:bg-orange-100' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-300 hover:text-orange-400'
                                }`}
                              >
                                {needsAttention ? <AlertTriangle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                            )}
                            {past && assigned.length === 0 && <span className="text-gray-200 text-xs text-center">-</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal?.type === 'employee' && (
        <EmployeeRosterModal
          employee={modal.employee}
          date={modal.date}
          shops={shops}
          existingRosters={rosters}
          defaults={defaults}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {modal?.type === 'branch' && (
        <BranchRosterModal
          date={modal.date}
          shop={modal.shop}
          employees={employees}
          existingRosters={rosters}
          defaults={defaults}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
