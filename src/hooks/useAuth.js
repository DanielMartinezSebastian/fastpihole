import { useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from '../i18n/I18nContext.jsx'

export function useAuth() {
  const { t } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/check')
      setIsAuthenticated(response.data.authenticated || false)
    } catch (err) {
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (password) => {
    try {
      const response = await axios.post('/api/auth/login', { password })
      if (response.status === 200) {
        setIsAuthenticated(true)
        return { success: true }
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || t('errors.invalidPassword') }
    }
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
      setIsAuthenticated(false)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return { isAuthenticated, isLoading, login, logout }
}
