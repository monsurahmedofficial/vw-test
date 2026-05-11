export const CATEGORIES = [
  { value: 'Operations', color: 'bg-blue-100 text-blue-700' },
  { value: 'Sales',      color: 'bg-orange-100 text-orange-700' },
  { value: 'Delivery',   color: 'bg-purple-100 text-purple-700' },
  { value: 'Cleaning',   color: 'bg-teal-100 text-teal-700' },
  { value: 'Stock',      color: 'bg-amber-100 text-amber-700' },
  { value: 'Display',    color: 'bg-pink-100 text-pink-700' },
  { value: 'Other',      color: 'bg-gray-100 text-gray-600' },
];

export function categoryStyle(value) {
  return CATEGORIES.find(c => c.value === value)?.color ?? 'bg-gray-100 text-gray-600';
}

export const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
];
