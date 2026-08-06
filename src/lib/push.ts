import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** True only if a VAPID public key is configured in the build. */
export const pushConfigured = !!VAPID_PUBLIC

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export type EnablePushResult = 'ok' | 'unsupported' | 'unconfigured' | 'denied' | 'error'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  } catch (e) {
    console.warn('SW registration failed', e)
    return null
  }
}

/**
 * Ask permission (if needed), subscribe to Web Push, and store the subscription
 * in Supabase. Safe to call repeatedly — it upserts the current subscription.
 */
export async function enablePush(userId: string): Promise<EnablePushResult> {
  if (!pushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC) return 'unconfigured'
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready)
    await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      })
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'error'

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' }
    )
    if (error) {
      console.warn('save push subscription failed', error)
      return 'error'
    }
    return 'ok'
  } catch (e) {
    console.warn('enablePush failed', e)
    return 'error'
  }
}

/** If permission is already granted, silently make sure we have a subscription. */
export async function ensurePushSubscribed(userId: string): Promise<void> {
  if (!pushConfigured || !pushSupported()) return
  if (Notification.permission !== 'granted') return
  await enablePush(userId)
}

export interface TestPushResult {
  ok: boolean
  subscriptions: number
  sent: number
  message: string
}

/** Ask the Edge Function to push a test notification to this device right now. */
export async function sendTestPush(): Promise<TestPushResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { test: true },
    })
    if (error) {
      return {
        ok: false,
        subscriptions: 0,
        sent: 0,
        message:
          'Couldn’t reach the push function. Make sure the send-push Edge Function is deployed.',
      }
    }
    const subs = Number(data?.subscriptions ?? 0)
    const sent = Number(data?.sent ?? 0)
    if (sent > 0) return { ok: true, subscriptions: subs, sent, message: 'Test push sent 🎉' }
    if (subs === 0)
      return {
        ok: false,
        subscriptions: 0,
        sent: 0,
        message: 'This device isn’t subscribed yet — tap Enable first (and check the VAPID key).',
      }
    return {
      ok: false,
      subscriptions: subs,
      sent: 0,
      message: 'Subscription found but the push failed — check the VAPID keys on the server.',
    }
  } catch {
    return {
      ok: false,
      subscriptions: 0,
      sent: 0,
      message: 'Could not send a test push — is the Edge Function deployed?',
    }
  }
}

/** Keep the user's timezone in sync so server pushes fire at the right local time. */
export async function syncTimezone(userId: string, current?: string | null): Promise<void> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && tz !== current) {
      await supabase.from('profiles').update({ timezone: tz }).eq('id', userId)
    }
  } catch {
    /* non-critical */
  }
}
