import { ArrowLeft, Home, LogOut, Settings2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import Logo from './Logo'
import { useTranslation } from '../i18n/I18nContext.jsx'

// Wraps children in a real button when a home handler is given (i.e. we're
// not on the main page), otherwise renders them inert — used for both the
// brand mark and the status badge, which share the same "take me home" job.
function HomeLink({ onGoHome, className, children }) {
  if (!onGoHome) {
    return <div className={className}>{children}</div>
  }
  return (
    <button type="button" onClick={onGoHome} className={`${className} transition-opacity hover:opacity-80`}>
      {children}
    </button>
  )
}

// Shared across Dashboard and Settings so both keep the same brand mark,
// status badge and logout affordance instead of drifting independently.
// The settings/home slot is a single button that swaps meaning depending on
// the page: onOpenSettings (Dashboard -> Settings) or onGoHome (Settings ->
// Dashboard, redundant with onBack and the clickable badge/brand — several
// ways back, all by design).
export default function Header({ isLoading, isEnabled, onBack, onOpenSettings, onGoHome, onLogout }) {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between max-w-6xl px-4 py-3 mx-auto sm:px-6">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mr-1">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          <HomeLink onGoHome={onGoHome} className="flex items-center gap-2">
            <Logo className="w-5 h-5 text-orange-500" />
            <h1 className="text-base leading-none font-brand">fastPiHole</h1>
          </HomeLink>
        </div>
        <div className="flex items-center gap-3">
          <HomeLink onGoHome={onGoHome}>
            <Badge variant={isLoading ? 'secondary' : isEnabled ? 'success' : 'warning'} className="text-xs">
              {isLoading ? '...' : isEnabled ? t('header.statusActive') : t('header.statusPaused')}
            </Badge>
          </HomeLink>
          {onGoHome && (
            <Button variant="ghost" size="sm" onClick={onGoHome}>
              <Home className="h-3.5 w-3.5" />
            </Button>
          )}
          {onOpenSettings && (
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
