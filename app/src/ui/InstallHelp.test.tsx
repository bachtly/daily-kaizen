import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InstallHelp } from './InstallHelp';
import { detectInstallBrowser } from './installBrowser';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1';
const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0';
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

afterEach(cleanup);

describe('detectInstallBrowser', () => {
  it.each([
    [SAFARI, 'iPhone', 5, 'ios-safari'],
    [CHROME_IOS, 'iPhone', 5, 'ios-chrome'],
    [IPAD_AS_MAC, 'MacIntel', 5, 'ios-safari'],
    [IPAD_AS_MAC, 'MacIntel', 0, 'elsewhere'],
    [CHROME_WIN, 'Win32', 0, 'elsewhere'],
    [CHROME_ANDROID, 'Linux armv81', 5, 'android-chrome'],
    [SAMSUNG, 'Linux armv81', 5, 'elsewhere'],
    [FIREFOX_ANDROID, 'Linux armv81', 5, 'elsewhere'],
    [ANDROID_WEBVIEW, 'Linux armv81', 5, 'elsewhere'],
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

  it('gives Android Chrome four steps through the ⋮ menu and Install', () => {
    render(<InstallHelp browser="android-chrome" address="kaizen.example" />);
    expect(items()).toEqual([
      'Tap ⋮ at the right of the address bar',
      'Tap Add to Home screen',
      'Tap Install',
      'Open daily-kaizen from your Home screen',
    ]);
  });

  it('sends any other browser or device to a phone, with the address', () => {
    render(<InstallHelp browser="elsewhere" address="kaizen.example" />);
    expect(screen.getByRole('heading').textContent).toBe('Open daily-kaizen on your phone');
    expect(screen.getByText(/Chrome on Android/)).toBeTruthy();
    expect(screen.getByText('kaizen.example')).toBeTruthy();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('has a way back', () => {
    render(<InstallHelp browser="ios-safari" address="kaizen.example" />);
    expect(screen.getByRole('link', { name: '‹ Back' }).getAttribute('href')).toBe('/');
  });
});
