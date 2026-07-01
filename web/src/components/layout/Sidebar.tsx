import {
  Clapperboard,
  FolderOpen,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Smartphone,
  SquarePlay,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import { KeysStatus } from './KeysStatus'

const NAV = [
  { to: '/', label: 'Студия', icon: Clapperboard, end: true },
  { to: '/create/short', label: 'Shorts', icon: Smartphone },
  { to: '/create/video', label: 'Видео из стоков', icon: SquarePlay },
  { to: '/translate', label: 'Перевод', icon: Languages },
  { to: '/assets', label: 'Ассеты', icon: FolderOpen },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === '1',
  )

  const toggle = () => {
    setCollapsed((v) => {
      localStorage.setItem('sidebar-collapsed', v ? '0' : '1')
      return !v
    })
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-line bg-ink-950/55 backdrop-blur-xl transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-58',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-5 py-5', collapsed && 'px-0 justify-center')}>
        <span className="relative flex size-3 items-center justify-center">
          <span className="absolute size-3 rounded-full bg-amber-500/25 shadow-[0_0_12px_2px_rgba(246,166,35,.45)]" />
          <span className="size-1.5 rounded-full bg-amber-500" />
        </span>
        {!collapsed && (
          <span className="text-display text-[13px] font-semibold tracking-wide text-text-hi">
            SHORTGPT<span className="ml-1.5 font-normal text-text-low">studio</span>
          </span>
        )}
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors duration-120',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-gradient-to-r from-amber-500/12 to-transparent text-text-hi'
                  : 'text-text-mid hover:bg-ink-900/60 hover:text-text-hi',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-amber-500 shadow-[0_0_8px_1px_rgba(246,166,35,.6)]" />
                )}
                <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <KeysStatus collapsed={collapsed} />

      <button
        type="button"
        onClick={toggle}
        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        className="mx-3 mb-4 flex items-center justify-center rounded-md p-2 text-text-low transition-colors duration-120 hover:bg-ink-900 hover:text-text-mid"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </aside>
  )
}
