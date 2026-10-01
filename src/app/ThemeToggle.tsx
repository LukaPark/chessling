import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { iconButton } from '../ui/button.css'
import { Icon } from '../ui/Icon'
import * as s from '../styles/features/layout.css'
import { useTheme } from './theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'
  return (
    <button type="button" className={iconButton} aria-label={label} title={label} onClick={toggle}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={theme}
          className={s.themeIcon}
          initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <Icon icon={theme === 'dark' ? Moon : Sun} />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
