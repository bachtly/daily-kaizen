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
/** Android Chrome's menu button: three dots stacked. */
const VDotsIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
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

const AndroidMenuArt = () => (
  <div className="art art-menu">
    <div className="art-row"><span>Bookmarks</span><BookIcon /></div>
    <div className="art-row art-row-target"><span>Add to Home screen</span><PlusIcon /></div>
  </div>
);

const AndroidInstallArt = () => (
  <div className="art art-menu">
    <div className="art-head"><span>Cancel</span><b>Install app</b><span className="art-target art-add">Install</span></div>
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

const Back = () => <a className="link install-back" href="/">‹ Back</a>;

/** The /install page, linked from Sign in and Settings. The app works in any browser; the Home Screen app adds push. */
export function InstallHelp({ browser, address = window.location.host }: { browser: InstallBrowser; address?: string }) {
  if (browser === 'elsewhere') {
    return (
      <Phone>
        <Back />
        <header className="install-head">
          <img src="/icons/apple-touch-icon.png" alt="" width="56" height="56" />
          <h1>Open daily-kaizen on your phone</h1>
          <p>You can use it here, but Nudges and the Review reminder push only reach the Home Screen app on a phone. Go to this address in Safari or Chrome on iPhone, or Chrome on Android:</p>
        </header>
        <p className="install-address">{address}</p>
        <p className="install-hint install-next">Your phone will show you the rest of the steps.</p>
      </Phone>
    );
  }
  const head = (
    <header className="install-head">
      <img src="/icons/apple-touch-icon.png" alt="" width="56" height="56" />
      <h1>Add daily-kaizen to your Home Screen</h1>
      <p>It opens full screen and can send Nudges and the Review reminder. It takes about 20 seconds.</p>
    </header>
  );
  if (browser === 'android-chrome') {
    return (
      <Phone>
        <Back />
        {head}
        <ol className="install-steps">
          <Step title={<>Tap <b>⋮</b> at the right of the address bar</>}>
            <AddressArt address={address}><VDotsIcon /></AddressArt>
          </Step>
          <Step title={<>Tap <b>Add to Home screen</b></>} hint="Some versions call it Install app.">
            <AndroidMenuArt />
          </Step>
          <Step title={<>Tap <b>Install</b></>}>
            <AndroidInstallArt />
          </Step>
          <Step title={<>Open <b>daily-kaizen</b> from your Home screen</>}>
            <HomeArt />
          </Step>
        </ol>
      </Phone>
    );
  }
  const safari = browser === 'ios-safari';
  return (
    <Phone>
      <Back />
      {head}
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
        <Step title={<>Open <b>daily-kaizen</b> from your Home Screen</>} hint="Sign in there once more: the Home Screen app keeps its own sign-in.">
          <HomeArt />
        </Step>
      </ol>
    </Phone>
  );
}
