import { supabase } from './supabase';

export type PushNotificationStatus =
  | 'loading'
  | 'unsupported'
  | 'unconfigured'
  | 'ios-install-required'
  | 'denied'
  | 'disabled'
  | 'enabled';

const VAPID_PUBLIC_KEY = String((import.meta as any).env.VITE_WEB_PUSH_PUBLIC_KEY || '').trim();

const isStandalonePwa = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

const urlBase64ToUint8Array = (value: string) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

const getRegistration = async () => {
  if (!('serviceWorker' in navigator)) throw new Error('Service worker nie je podporovaný.');
  return navigator.serviceWorker.ready;
};

export const getPushNotificationStatus = async (): Promise<PushNotificationStatus> => {
  if (!isStandalonePwa()) return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (!VAPID_PUBLIC_KEY) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'enabled' : 'disabled';
  } catch {
    return 'disabled';
  }
};

export const enablePushNotifications = async () => {
  if (!isStandalonePwa()) {
    throw new Error('Notifikácie sú dostupné len v aplikácii.');
  }
  if (!VAPID_PUBLIC_KEY) throw new Error('Chýba verejný VAPID kľúč.');
  if (!('Notification' in window) || !('PushManager' in window)) {
    throw new Error('Tento prehliadač nepodporuje push upozornenia.');
  }

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;

  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Upozornenia sú zablokované v nastaveniach zariadenia alebo prehliadača.'
      : 'Bez povolenia nie je možné upozornenia zapnúť.');
  }

  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();
  let createdNow = false;

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    createdNow = true;
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint || subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    if (createdNow) await subscription.unsubscribe().catch(() => undefined);
    throw new Error('Prehliadač neposkytol kompletné údaje push odberu.');
  }

  const { error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: navigator.userAgent
  });

  if (error) {
    if (createdNow) await subscription.unsubscribe().catch(() => undefined);
    throw new Error(`Odber upozornení sa nepodarilo uložiť: ${error.message}`);
  }

  return subscription;
};

export const disablePushNotifications = async () => {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const { error } = await supabase.rpc('remove_push_subscription', {
    p_endpoint: subscription.endpoint
  });
  if (error) throw new Error(`Odber upozornení sa nepodarilo odstrániť: ${error.message}`);

  await subscription.unsubscribe();
};
