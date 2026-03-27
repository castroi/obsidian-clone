'use client'
import styles from './Toggle.module.css'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: Props) {
  return (
    <label className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}>
      <div
        className={`${styles.track} ${checked ? styles.on : ''}`}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); !disabled && onChange(!checked) }
        }}
      >
        <div className={styles.thumb} />
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
