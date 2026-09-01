import { useToast } from '../hooks/useToast';
import { IconClose, IconWarning, IconAlert, IconCheck, IconInfo } from './Icons';

const KIND_TO_ICON = {
  warn:    { Cmp: IconWarning, label: '!' },
  danger:  { Cmp: IconAlert,   label: '!' },
  success: { Cmp: IconCheck,   label: '✓' },
  info:    { Cmp: IconInfo,    label: 'i' },
};

export default function Toasts() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const entry = KIND_TO_ICON[t.kind] || KIND_TO_ICON.info;
        const Icon = entry.Cmp;
        return (
          <div key={t.id} className={`toast ${t.kind || 'info'}`}>
            <div className="icon"><Icon size={14} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title">{t.title}</div>
              {t.body && <div className="body">{t.body}</div>}
            </div>
            <button className="close-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <IconClose size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}