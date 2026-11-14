'use client';

export function DeskSwitch({
  label,
  views,
  current,
  onChange,
}: {
  label: string;
  views: { id: string; label: string }[];
  current: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="dw-actions dw-actions--chips" role="group" aria-label={label}>
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          className="dw-btn dw-btn--chip"
          aria-pressed={current === view.id}
          onClick={() => onChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
