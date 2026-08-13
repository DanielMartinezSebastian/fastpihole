import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Pi-hole v6's web UI resolves clean URLs like /admin/settings/api by
// trying settings/api.lp, then falling back to settings-api.lp (last "/"
// swapped for "-") — see pi-hole/FTL's FTL_rewrite_pattern. Same host:port
// as the API calls, since both are served by the same webserver.
export function piHoleAdminUrl(host, port, path = '') {
  return `https://${host || 'pi.hole'}:${port || '443'}/admin${path}`
}
