import { Button } from '@/components/ui/button.jsx';

export default function Pager({ page, totalPages, totalItems, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>Page {page}/{totalPages} • Total {totalItems}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>Prev</Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>Next</Button>
      </div>
    </div>
  );
}
