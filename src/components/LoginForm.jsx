import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import Logo from './Logo'
import { useTranslation } from '../i18n/I18nContext.jsx'

export default function LoginForm({ login }) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await login(password)
    if (!result.success) {
      setPassword('')
      toast.error(result.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex items-center justify-center min-h-dvh p-4 bg-background">
      <Card className="w-full max-w-sm border border-border">
        <CardHeader className="space-y-0 border-border">
          <div className="flex justify-center -mb-2">
            <Logo className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="-mt-8 text-3xl leading-none text-center font-brand">fastPiHole</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className="border bg-input border-border"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !password}
            >
              {isSubmitting ? t('login.authenticating') : t('login.continue')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
