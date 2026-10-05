import { apiGet, apiPost, apiDelete } from './client';

export interface PushPublicKeyResponse {
  enabled: boolean;
  publicKey: string | null;
}

interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const pushApi = {
  publicKey: () => apiGet<PushPublicKeyResponse>('push/public-key'),
  subscribe: (payload: PushSubscriptionPayload) =>
    apiPost<void>('push/subscriptions', payload),
  unsubscribe: (endpoint: string) =>
    apiDelete<void>(`push/subscriptions?endpoint=${encodeURIComponent(endpoint)}`),
};

/** Converts a PushSubscription JSON value into what the API expects. */
function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  // toJSON() is typed without the applicationServerKey fields the API expects.
  const json = subscription.toJSON() as PushSubscriptionJSON & {
    p256dh: string;
    auth: string;
  };

  return {
    endpoint: subscription.endpoint,
    p256dh: json.p256dh,
    auth: json.auth,
  };
}

export type PushPermissionState = 'unsupported' | 'denied' | 'default' | 'granted' | 'disabled';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function currentPermission(): PushPermissionState {
  if (!pushSupported()) return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';

  return Notification.permission as PushPermissionState;
}

async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  return (await navigator.serviceWorker.getRegistration('/')) ?? null;
}

/** True when this browser already has a working push subscription. */
export async function isSubscribed(): Promise<boolean> {
  const registration = await activeRegistration();
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
}

/**
 * Subscribes this browser to push. Must be called from a user gesture, since
 * the permission prompt is shown on request.
 */
export async function subscribeToPush(): Promise<'subscribed' | 'denied' | 'unavailable'> {
  if (!pushSupported()) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const { enabled, publicKey } = await pushApi.publicKey();
  if (!enabled || !publicKey) return 'unavailable';

  const registration = await activeRegistration();
  if (!registration) return 'unavailable';

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    }));

  await pushApi.subscribe(toPayload(subscription));

  return 'subscribed';
}

/** Removes this browser's push subscription, both locally and server-side. */
export async function unsubscribeFromPush(): Promise<void> {
  const registration = await activeRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) return;

  await pushApi.unsubscribe(subscription.endpoint).catch(() => {
    // The server row may already be gone; the local cleanup still matters.
  });

  await subscription.unsubscribe();
}

function base64UrlToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}