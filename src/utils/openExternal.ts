/**
 * Safely opens an external URL in the user's default system browser.
 * Uses Tauri's plugin-opener in native desktop runtime, falling back to window.open in web mode.
 */
export async function openExternalUrl(url: string | undefined | null): Promise<void> {
  if (!url) return;

  try {
    // Check if running inside Tauri native desktop environment
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    }
  } catch (err) {
    console.warn('[openExternalUrl] Tauri opener failed, falling back to window.open:', err);
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
