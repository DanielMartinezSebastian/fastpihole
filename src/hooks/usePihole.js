import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'

function extractErrorMessage(err, fallback) {
  return err.response?.data?.error || err.message || fallback
}

// Poll ticks every 5s, so a single slow/timed-out response (Pi-hole session
// refreshing, a momentary blip) would otherwise pop a toast every time it
// happens even though the connection is genuinely fine overall. Only
// surface it once a failure persists across consecutive polls.
const POLL_FAILURE_THRESHOLD = 2

export function usePihole(enabled = true) {
  const [status, setStatus] = useState('unknown')
  const [summary, setSummary] = useState(null)
  const [clients, setClients] = useState([])
  const [systemInfo, setSystemInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const consecutiveFailures = useRef(0)

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, summaryRes, clientsRes, systemRes] = await Promise.all([
        axios.get('/api/pihole/status'),
        axios.get('/api/pihole/summary'),
        axios.get('/api/pihole/clients'),
        axios.get('/api/pihole/system-info'),
      ])

      consecutiveFailures.current = 0
      setError(null)
      setStatus(statusRes.data.status)
      setSummary(summaryRes.data)
      setClients((clientsRes.data?.clients || []).slice(0, 10))
      setSystemInfo(systemRes.data)
    } catch (err) {
      consecutiveFailures.current += 1
      if (consecutiveFailures.current >= POLL_FAILURE_THRESHOLD) {
        setError(extractErrorMessage(err, 'Error fetching Pi-hole data'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [enabled, fetchData])

  const enableBlocking = useCallback(async () => {
    try {
      await axios.post('/api/pihole/enable')
      await fetchData()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error enabling blocking'))
    }
  }, [fetchData])

  const disableBlocking = useCallback(async () => {
    try {
      await axios.post('/api/pihole/disable')
      await fetchData()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error disabling blocking'))
    }
  }, [fetchData])

  const toggleClientBlock = useCallback(async (client) => {
    try {
      await axios.post(`/api/pihole/clients/${encodeURIComponent(client)}/toggle`)
      await fetchData()
    } catch (err) {
      setError(extractErrorMessage(err, 'Error toggling client'))
    }
  }, [fetchData])

  return {
    status,
    summary,
    clients,
    systemInfo,
    isLoading,
    error,
    enableBlocking,
    disableBlocking,
    toggleClientBlock,
    refetch: fetchData,
  }
}
