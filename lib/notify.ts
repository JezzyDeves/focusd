/** Desktop notifications, so time-up still reaches you when focusd is in a background tab or window. */

const ICON = "/apple-icon.png";
/** Shared tag, so a new notification replaces the last one instead of stacking. */
const TAG = "focusd";

export const notifySupported = () => typeof window !== "undefined" && "Notification" in window;

/**
 * Ask for permission to show notifications. Must be called from a user gesture.
 * Resolves to whether notifications are allowed.
 */
export async function requestNotify(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Pop up a desktop notification. Clicking it brings the focusd tab to the front. Does nothing without permission. */
export function notify(title: string, body: string, onClick?: () => void) {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: ICON, tag: TAG });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    // Android Chrome only allows notifications from a service worker and throws here.
  }
}
