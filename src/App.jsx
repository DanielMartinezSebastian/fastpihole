import { useState } from 'react'
import { Toaster } from 'sonner'
import { useAuth } from './hooks/useAuth'
import { usePihole } from './hooks/usePihole'
import { useTranslation } from './i18n/I18nContext.jsx'
import LoginForm from './components/LoginForm'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'

export default function App() {
  const { isAuthenticated, isLoading, login, logout } = useAuth()
  const { t } = useTranslation()
  const [view, setView] = useState('dashboard')
  // Lifted above Dashboard/Settings so switching views doesn't unmount/remount
  // the poller — that used to reset isLoading and flash the header badge.
  const pihole = usePihole(isAuthenticated)

  let content
  if (isLoading) {
    content = (
      <div className="flex items-center justify-center min-h-dvh bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.checkingAuth')}</p>
        </div>
      </div>
    )
  } else if (!isAuthenticated) {
    content = <LoginForm login={login} />
  } else if (view === 'settings') {
    content = <Settings onBack={() => setView('dashboard')} onLogout={logout} pihole={pihole} />
  } else {
    content = <Dashboard onLogout={logout} onOpenSettings={() => setView('settings')} pihole={pihole} />
  }

  return (
    <>
      {content}
      <Toaster
        position="bottom-center"
        theme="dark"
        toastOptions={{
          classNames: {
            toast: '!border !border-border !bg-card !text-foreground !shadow-lg',
            success: '!border-success/50',
            error: '!border-warning/50'
          }
        }}
      />
    </>
  )
}
