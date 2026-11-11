import { InstallHelp } from './InstallHelp';
import { detectInstallBrowser } from './installBrowser';

/** /install: Add to Home Screen steps for this device. Needs no session. */
export function InstallScreen() {
  return <InstallHelp browser={detectInstallBrowser(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)} />;
}
