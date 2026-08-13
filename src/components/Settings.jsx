import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { PasswordInput } from './ui/password-input'
import Header from './Header'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from '../i18n/I18nContext.jsx'

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function Settings({ onBack, onLogout, pihole }) {
  const { settings, isLoading, saveSettings, testConnection, revealApiToken } = useSettings()
  const { t, language, setLanguage, languages } = useTranslation()
  const isEnabled = pihole.status === 'enabled'

  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [connSaving, setConnSaving] = useState(false)
  const [connTesting, setConnTesting] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setHost(settings.piHoleHost || '')
      setPort(settings.piHolePort || '')
    }
  }, [settings])

  // Only fetches the real stored token when the field is still empty —
  // if the user already pasted/typed a replacement, revealing just shows that.
  const handleRevealToken = async () => {
    if (!apiToken && settings?.hasPiHoleApiToken) {
      const token = await revealApiToken()
      setApiToken(token)
    }
  }

  const handleTestConnection = async () => {
    setConnTesting(true)
    const result = await testConnection({ host, port, apiToken: apiToken || undefined })
    if (result.success) toast.success(t('settings.toastConnectionOk'))
    else toast.error(result.error)
    setConnTesting(false)
  }

  const handleSaveConnection = async (e) => {
    e.preventDefault()
    setConnSaving(true)
    const result = await saveSettings({ host, port, apiToken: apiToken || undefined })
    if (result.success) {
      toast.success(t('settings.toastSaved'))
      setApiToken('')
    } else {
      toast.error(result.error)
    }
    setConnSaving(false)
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(t('settings.toastPasswordMismatch'))
      return
    }

    setPwdSaving(true)
    const result = await saveSettings({ currentPassword, newPassword })
    if (result.success) {
      toast.success(t('settings.toastPasswordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      toast.error(result.error)
    }
    setPwdSaving(false)
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header isLoading={pihole.isLoading} isEnabled={isEnabled} onBack={onBack} onGoHome={onBack} onLogout={onLogout} />

      <main className="max-w-2xl px-4 py-4 mx-auto sm:px-6 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        {isLoading ? (
          <p className="py-6 text-sm text-center text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <Card className="border border-border">
              <CardHeader className="pb-4 border-b border-border">
                <CardTitle className="text-base font-semibold">{t('settings.connectionTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <form onSubmit={handleSaveConnection} className="space-y-4">
                  <Field label={t('settings.hostLabel')}>
                    <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="pi.hole" />
                  </Field>
                  <Field label={t('settings.portLabel')}>
                    <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="443" />
                  </Field>
                  <Field label={settings?.hasPiHoleApiToken ? t('settings.tokenLabelConfigured') : t('settings.tokenLabel')}>
                    <PasswordInput
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      onBeforeReveal={handleRevealToken}
                      placeholder={settings?.hasPiHoleApiToken ? '••••••••' : t('settings.tokenPlaceholder')}
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleTestConnection} disabled={connTesting}>
                      {connTesting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      {t('settings.testConnection')}
                    </Button>
                    <Button type="submit" disabled={connSaving}>
                      {connSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      {t('settings.save')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="pb-4 border-b border-border">
                <CardTitle className="text-base font-semibold">{t('settings.passwordTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSavePassword} className="space-y-4">
                  {settings?.hasDashboardPassword && (
                    <Field label={t('settings.currentPassword')}>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </Field>
                  )}
                  <Field label={t('settings.newPassword')}>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </Field>
                  <Field label={t('settings.confirmPassword')}>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Field>

                  <Button type="submit" disabled={pwdSaving || !newPassword}>
                    {pwdSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {t('settings.changePassword')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="pb-4 border-b border-border">
                <CardTitle className="text-base font-semibold">{t('settings.languageTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {languages.map((lang) => (
                    <Button
                      key={lang.code}
                      type="button"
                      variant={language === lang.code ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => setLanguage(lang.code)}
                    >
                      {lang.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
