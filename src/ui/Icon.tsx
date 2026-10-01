import type { LucideIcon } from 'lucide-react'

export function Icon({ icon: Glyph, size = 20, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <Glyph size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" className={className} />
}
