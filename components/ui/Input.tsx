import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const BASE =
  'w-full rounded-xl border-2 border-fx-purpura/20 bg-white px-4 py-2.5 text-sm ' +
  'text-fx-purpura-oscuro placeholder-fx-purpura-oscuro/30 transition-colors ' +
  'focus:outline-none focus:border-fx-purpura focus:ring-2 focus:ring-fx-purpura/10'

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2"
        >
          {label}
        </label>
      )}
      <input id={id} className={`${BASE} ${className}`} {...props} />
      {error && <p className="text-xs text-fx-magenta mt-1">{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2"
        >
          {label}
        </label>
      )}
      <select id={id} className={`${BASE} ${className}`} {...props}>
        {children}
      </select>
    </div>
  )
}
