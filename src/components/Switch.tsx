/** A themed on/off switch that keeps its reason visible (tooltips don't exist on phones). */
export function Switch({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="switch-row">
      <button type="button" role="switch" aria-checked={on} className="switch" disabled={disabled} onClick={() => onChange(!on)}>
        <span className="switch-track" aria-hidden><span className="switch-thumb" /></span>
        <span>{label}</span>
      </button>
      {hint && <span className="faint small switch-hint">{hint}</span>}
    </div>
  )
}
