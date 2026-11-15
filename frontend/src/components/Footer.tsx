import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="pt-2 pb-3 text-center text-[14px] font-secondary" style={{ color: 'var(--text-muted)' }}>
      Todos los valores son simulados · Herramienta de apoyo a bordo, no sustituye al personal médico.
    </footer>
  )
}
