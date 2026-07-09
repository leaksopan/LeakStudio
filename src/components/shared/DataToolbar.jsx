import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function DataToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  actions = null,
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="md:col-span-2 flex flex-wrap gap-2">
        {actions}
      </div>
    </div>
  );
}
