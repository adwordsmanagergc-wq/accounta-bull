// Thin wrappers around the browser Notification API.

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied'
}

/** Ask for permission. Call this from a user gesture (e.g. after signup). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showChargeNotification(goalTitle: string, timeOfDay: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification('🐂 Charge Call', {
      body: `"${goalTitle}" starts at ${timeOfDay}. Time to charge.`,
      icon: `${import.meta.env.BASE_URL}logo.svg`,
      tag: `charge-${goalTitle}-${timeOfDay}`,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* ignore */
  }
}
