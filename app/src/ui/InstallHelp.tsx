import type { ReactNode } from 'react';
import type { InstallBrowser } from './installBrowser';
import { Phone } from './Phone';

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const ShareIcon = () => <Icon><path d="M12 15V3M8 7l4-4 4 4M7 11H5v10h14V11h-2" /></Icon>;
const PlusIcon = () => <Icon><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></Icon>;
const BookIcon = () => <Icon><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14" /></Icon>;
const DotsIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
);

/** Browser address bar with the button to tap ringed. */
const AddressArt = ({ address, children }: { address: string; children: ReactNode }) => (
  <div className="art art-bar">
    <span className="art-address">{address}</span>
    <span className="art-target">{children}</span>
  </div>
);

const MenuArt = () => (
  <div className="art art-menu">
    <div className="art-row"><span>Add Bookmark</span><BookIcon /></div>
    <div className="art-row art-row-target"><span>Add to Home Screen</span><PlusIcon /></div>
  </div>
);

const AddArt = ({ webAppToggle }: { webAppToggle: boolean }) => (
  <div className="art art-menu">
    <div className="art-head"><span>Cancel</span><b>Add to Home Screen</b><span className="art-target art-add">Add</span></div>
    {webAppToggle && <div className="art-row"><span>Open as Web App</span><span className="art-toggle" /></div>}
  </div>
);

const HomeArt = () => (
  <div className="art art-home">
    <img src="/icons/apple-touch-icon.png" alt="" width="60" height="60" />
    <span>daily-kaizen</span>
  </div>
);

function Step({ title, hint, children }: { title: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <li className="install-step">
      <p className="install-step-title">{title}</p>
      {hint && <p className="install-hint">{hint}</p>}
      <div aria-hidden="true">{children}</div>
    </li>
  );
}

/** Shown instead of Sign in when the app isn't running from the Home Screen (AC-7.1). */
export function InstallHelp({ browser, address = window.location.host }: { browser: InstallBrowser; address?: string }) {
  if (browser === 'elsewhere') {
    return (
      <Phone>
        <header className="install-head">
          <img src="/icons/apple-touch-icon.png" alt="" width="56" height="56" />
          <h1>Open daily-kaizen on your iPhone</h1>
          <p>It runs from the iPhone Home Screen, so you can't sign in from this device. Go to this address in Safari or Chrome on your iPhone:</p>
        </header>
        <p className="install-address">{address}</p>
        <p className="install-hint install-next">Your iPhone will show you the rest of the steps.</p>
      </Phone>
    );
  }
  const safari = browser === 'ios-safari';
  return (
    <Phone>
      <header className="install-head">
        <img src="/icons/apple-touch-icon.png" alt="" width="56" height="56" />
        <h1>Add daily-kaizen to your Home Screen</h1>
        <p>You sign in from the Home Screen app, not from this browser. It takes about 20 seconds.</p>
      </header>
      <ol className="install-steps">
        {safari ? (
          <Step title={<>Tap <b>⋯</b> next to the address bar, then <b>Share</b></>} hint="No ⋯ button? Tap the Share button instead.">
            <AddressArt address={address}><DotsIcon /></AddressArt>
          </Step>
        ) : (
          <Step title={<>Tap <b>Share</b> in the address bar</>} hint="It's at the right end of the bar, next to the address.">
            <AddressArt address={address}><ShareIcon /></AddressArt>
          </Step>
        )}
        <Step title={<>Scroll down and tap <b>Add to Home Screen</b></>} hint="Not in the list? Tap View More first.">
          <MenuArt />
        </Step>
        <Step title={safari ? <>Keep <b>Open as Web App</b> on, then tap <b>Add</b></> : <>Tap <b>Add</b></>}>
          <AddArt webAppToggle={safari} />
        </Step>
        <Step title={<>Open <b>daily-kaizen</b> from your Home Screen</>} hint="Then sign in with your email.">
          <HomeArt />
        </Step>
      </ol>
    </Phone>
  );
}
