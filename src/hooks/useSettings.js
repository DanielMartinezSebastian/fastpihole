import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from '../i18n/I18nContext.jsx'

export function useSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/settings')
      setSettings(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || t('errors.settingsLoadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (payload) => {
    try {
      const response = await axios.put('/api/settings', payload)
      setSettings(response.data.settings)
      return { success: true }
    } catch (err) {
      const errorMsg = err.response?.data?.error || t('errors.settingsSaveFailed')
      return { success: false, error: errorMsg }
    }
  }

  const testConnection = async (payload) => {
    try {
      await axios.post('/api/settings/test-connection', payload)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || t('errors.connectionFailed') }
    }
  }

  const revealApiToken = async () => {
    const response = await axios.get('/api/settings/reveal-token')
    return response.data.apiToken
  }

  return { settings, isLoading, error, saveSettings, testConnection, revealApiToken, refetch: fetchSettings }
}
