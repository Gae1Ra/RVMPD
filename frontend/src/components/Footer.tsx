import React from 'react'
import type { LinkMode } from '../hooks/useTelemetry'
import { useT } from '../i18n'

interface FooterProps {
  linkMode?: LinkMode
}

export const Footer: React.FC<FooterProps> = ({ linkMode }) => {
  const { t } = useT()
  const source = linkMode === 'live' ? t.footer.live : t.footer.demo
  return (
    <footer className="pt-2 pb-3 text-center text-[14px] font-secondary" style={{ color: 'var(--text-muted)' }}>
      {source} · {t.footer.disclaimer}
    </footer>
  )
}
