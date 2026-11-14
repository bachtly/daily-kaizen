export type InstallBrowser = 'ios-safari' | 'ios-chrome' | 'android-chrome' | 'elsewhere';

/**
 * Which steps to show. iPads asking for desktop sites report as a Mac with a touch screen.
 * Android browsers built on Chrome (Samsung Internet, Edge, Opera…) also say "Chrome/" but have other menus, so they get 'elsewhere'.
 */
export function detectInstallBrowser(ua: string, platform: string, maxTouchPoints: number): InstallBrowser {
  if (/Android/.test(ua)) {
    return /Chrome\//.test(ua) && !/SamsungBrowser|EdgA|OPR|YaBrowser|UCBrowser|Firefox|; wv\)/.test(ua) ? 'android-chrome' : 'elsewhere';
  }
  const ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (!ios) return 'elsewhere';
  return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-chrome' : 'ios-safari';
}
