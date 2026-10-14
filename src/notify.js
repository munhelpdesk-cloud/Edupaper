// EduPaper AI — system notifications (used by the "Send test notification" button in Settings).
// Android app: a real local notification through @capacitor/local-notifications on the plugin's default channel,
//   which plays the phone's own notification sound and vibration (no custom sound file is set).
// Browser / PWA: a service-worker notification (works on Android Chrome too) with sound left to the system, plus vibration.
// Resolves to 'sent' | 'denied' | 'unsupported'.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export async function systemNotify(title, body) {
  if (Capacitor.isNativePlatform()) {
    try {
      let p = await LocalNotifications.checkPermissions()
      if (p.display !== 'granted') p = await LocalNotifications.requestPermissions()
      if (p.display !== 'granted') return 'denied'
      await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Date.now() % 2147483000), title, body, schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true } }] })
      return 'sent'
    } catch { return 'unsupported' }
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  try {
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    const opts = { body, icon: '/mark.png', badge: '/mark.png', silent: false, vibrate: [200, 100, 200], tag: 'edupaper-test', renotify: true }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready)
      await reg.showNotification(title, opts)
    } else new Notification(title, opts)
    return 'sent'
  } catch { return 'unsupported' }
}
