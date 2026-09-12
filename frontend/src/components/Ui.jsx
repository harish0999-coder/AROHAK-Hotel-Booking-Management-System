import React from 'react';

const STATUS_STYLES = {
  CONFIRMED: 'bg-teal/10 text-teal-dark border-teal/20',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  COMPLETED: 'bg-slate/10 text-slate border-slate/20',
  PENDING: 'bg-brass/15 text-brass-dark border-brass/30',
  APPROVED: 'bg-teal/10 text-teal-dark border-teal/20',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  Active: 'bg-teal/10 text-teal-dark border-teal/20',
  Inactive: 'bg-slate/10 text-slate border-slate/20'
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate/10 text-slate border-slate/20';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

export function Alert({ variant = 'info', children, onClose }) {
  const styles = {
    info: 'bg-teal/8 border-teal/20 text-teal-dark',
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-teal/8 border-teal/20 text-teal-dark'
  };
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          &#10005;
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate">{description}</p>}
      {action}
    </div>
  );
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount || 0
  );
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
