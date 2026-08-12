import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Shield, ShieldOff, Lock, Unlock } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import Header from './Header'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from '../i18n/I18nContext.jsx'

export default function Dashboard({ onLogout, onOpenSettings, pihole }) {
  const { status, summary, clients, systemInfo, isLoading, error, enableBlocking, disableBlocking, toggleClientBlock } = pihole
  const { settings } = useSettings()
  const { t } = useTranslation()

  const [showTokenNag, setShowTokenNag] = useState(false)

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (settings && !settings.hasPiHoleApiToken) setShowTokenNag(true)
  }, [settings])

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatUptime = (seconds) => {
    if (!seconds) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h`
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const isEnabled = status === 'enabled'

  return (
    <div className="min-h-screen bg-background">
      <Header isLoading={isLoading} isEnabled={isEnabled} onOpenSettings={onOpenSettings} onLogout={onLogout} />

      <Dialog open={showTokenNag} onOpenChange={setShowTokenNag}>
        <DialogContent onClose={() => setShowTokenNag(false)}>
          <DialogHeader>
            <KeyRound className="w-8 h-8 mb-2 text-warning" />
            <DialogTitle>{t('dashboard.tokenModal.title')}</DialogTitle>
            <DialogDescription>{t('dashboard.tokenModal.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTokenNag(false)}>
              {t('dashboard.tokenModal.dismiss')}
            </Button>
            <Button
              onClick={() => {
                setShowTokenNag(false)
                onOpenSettings()
              }}
            >
              {t('dashboard.tokenModal.goToSettings')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main - Monochrome */}
      <main className="max-w-6xl px-4 py-8 mx-auto sm:px-6">

        {/* Grid: Stats (left on desktop) + Control (right on desktop) */}
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
          <Card className="order-2 border lg:order-1 border-border">
            <CardContent className="grid grid-cols-3 gap-4 pt-6 text-center sm:grid-cols-6 lg:grid-cols-2 lg:text-left">
              <div>
                <p className="mb-1 text-xs tracking-wide uppercase text-muted-foreground">{t('dashboard.stats.queries')}</p>
                <p className="text-xl font-semibold">{isLoading ? '—' : formatNumber(summary?.queries?.total || 0)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs tracking-wide uppercase text-muted-foreground">{t('dashboard.stats.blocked')}</p>
                <p className="text-xl font-semibold">{isLoading ? '—' : formatNumber(summary?.queries?.blocked || 0)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs tracking-wide uppercase text-muted-foreground">{t('dashboard.stats.rate')}</p>
                <p className="text-xl font-semibold">{isLoading ? '—' : Math.round(summary?.queries?.percent_blocked || 0)}%</p>
              </div>
              <div>
                <p className="mb-1 text-xs tracking-wide uppercase text-muted-foreground">{t('dashboard.system.uptime')}</p>
                <p className="text-xl font-semibold">{isLoading ? '—' : formatUptime(systemInfo?.uptime)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs tracking-wide uppercase text-muted-foreground">{t('dashboard.system.cpu')}</p>
                <p className="text-xl font-semibold">{isLoading || systemInfo?.cpuPercent == null ? '—' : `${Math.round(systemInfo.cpuPercent)}%`}</p>
              </div>
              <div>
                <p className="mb-1 text-xs tracking-wide uppercase text-muted-foreground">{t('dashboard.system.ram')}</p>
                <p className="text-xl font-semibold">{isLoading || systemInfo?.ramPercent == null ? '—' : `${Math.round(systemInfo.ramPercent)}%`}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 border lg:col-span-2 lg:order-2 border-border">
            <CardContent className="flex justify-center pt-8 pb-8">
              <button
                onClick={isEnabled ? disableBlocking : enableBlocking}
                disabled={isLoading}
                className={`flex h-40 w-40 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-full text-lg font-bold uppercase tracking-wide text-white transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isEnabled
                    ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 hover:brightness-110'
                    : 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 hover:brightness-110'
                }`}
              >
                {isEnabled ? <Lock className="w-8 h-8" /> : <Unlock className="w-8 h-8" />}
                {isLoading ? '...' : isEnabled ? t('dashboard.toggleOn') : t('dashboard.toggleOff')}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Devices */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t('dashboard.devicesTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="py-6 text-sm text-center text-muted-foreground">{t('common.loading')}</p>
            ) : clients && clients.length > 0 ? (
              <div className="space-y-2">
                {clients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 text-sm border rounded border-border/50">
                    <div>
                      <p className="font-medium">{c.comment || c.name || t('dashboard.deviceFallbackName')}</p>
                      <p className="font-mono text-xs text-muted-foreground">{c.client}</p>
                    </div>
                    <Button
                      variant={c.blocked ? "success" : "warning"}
                      size="sm"
                      onClick={() => toggleClientBlock(c.client)}
                    >
                      {c.blocked ? (
                        <>
                          <Shield className="h-3 w-3 mr-1.5" />
                          {t('dashboard.deviceBlocked')}
                        </>
                      ) : (
                        <>
                          <ShieldOff className="h-3 w-3 mr-1.5" />
                          {t('dashboard.deviceUnblocked')}
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-center text-muted-foreground">{t('dashboard.noDevices')}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
