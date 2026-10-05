import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  currentPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from '@/api/push';

/**
 * Notification toggle for the account menu. Web push needs the PWA to be
 * installed on iOS, and a browser permission that can only be requested from a
 * user gesture — hence the explicit button.
 */
export function NotificationToggle({ onDone }: { onDone?: () => void }) {
  const { notify } = useToast();
  const [state, setState] = useState<PushPermissionState | 'checking' | 'on' | 'off'>('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const permission = currentPermission();
      const subscribed = permission === 'granted' ? await isSubscribed() : false;

      if (!cancelled) setState(subscribed ? 'on' : permission);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      if (state === 'on') {
        await unsubscribeFromPush();
        setState('off');
        notify('Notifications turned off.', 'success');
      } else {
        const result = await subscribeToPush();

        if (result === 'subscribed') {
          setState('on');
          notify('Notifications enabled.', 'success');
        } else if (result === 'denied') {
          setState('denied');
          notify('Your browser blocked notifications for this site.', 'warning');
        } else {
          setState('default');
          notify('Push notifications are unavailable here. On iOS, install the app first.', 'warning');
        }
      }
    } catch {
      notify('Could not change notification settings.', 'error');
    } finally {
      setBusy(false);
      onDone?.();
    }
  }, [notify, onDone, state]);

  if (state === 'checking') return null;

  const enabled = state === 'on';
  const blocked = state === 'denied' || state === 'unsupported';

  const label = blocked
    ? 'Notifications blocked'
    : enabled
      ? 'Turn off notifications'
      : 'Turn on notifications';

  return (
    <button
      type="button"
      role="menuitem"
      onClick={toggle}
      disabled={busy || blocked}
      title={blocked ? 'Your browser is blocking notifications for this site' : undefined}
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-display text-[15px] text-ink hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {enabled ? <Bell size={15} /> : <BellOff size={15} className="text-ink-faint" />}
      {busy ? 'Working…' : label}
    </button>
  );
}