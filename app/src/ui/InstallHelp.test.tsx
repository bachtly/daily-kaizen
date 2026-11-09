import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InstallHelp } from './InstallHelp';
import { detectInstallBrowser } from './installBrowser';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1';
const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

afterEach(cleanup);

describe('detectInstallBrowser', () => {
  it.each([
    [SAFARI, 'iPhone', 5, 'ios-safari'],
    [CHROME_IOS, 'iPhone', 5, 'ios-chrome'],
    [IPAD_AS_MAC, 'MacIntel', 5, 'ios-safari'],
    [IPAD_AS_MAC, 'MacIntel', 0, 'elsewhere'],
    [CHROME_WIN, 'Win32', 0, 'elsewhere'],
  ])('%s on %s', (ua, platform, touch, expected) => {
    expect(detectInstallBrowser(ua, platform, touch)).toBe(expected);
  });
});

const items = () => screen.getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent);

describe('InstallHelp', () => {
  it('gives Safari four steps through the ⋯ menu and the web app switch', () => {
    render(<InstallHelp browser="ios-safari" address="kaizen.example" />);
    expect(items()).toEqual([
      'Tap ⋯ next to the address bar, then Share',
      'Scroll down and tap Add to Home Screen',
      'Keep Open as Web App on, then tap Add',
      'Open daily-kaizen from your Home Screen',
    ]);
  });

  it('points Chrome at its Share button, with no web app switch', () => {
    render(<InstallHelp browser="ios-chrome" address="kaizen.example" />);
    expect(items()[0]).toBe('Tap Share in the address bar');
    expect(items()[2]).toBe('Tap Add');
  });

  it('sends any other device to the iPhone, with the address', () => {
    render(<InstallHelp browser="elsewhere" address="kaizen.example" />);
    expect(screen.getByRole('heading').textContent).toBe('Open daily-kaizen on your iPhone');
    expect(screen.getByText('kaizen.example')).toBeTruthy();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});
