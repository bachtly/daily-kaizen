export type InstallBrowser = 'ios-safari' | 'ios-chrome' | 'elsewhere';

/** Which steps to show. iPads asking for desktop sites report as a Mac with a touch screen. */
export function detectInstallBrowser(ua: string, platform: string, maxTouchPoints: number): InstallBrowser {
  const ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (!ios) return 'elsewhere';
  return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-chrome' : 'ios-safari';
}
