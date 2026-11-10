import { composeStories } from '@storybook/react-vite';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { expect } from 'storybook/test';
import '../index.css';
import * as day from './DayScreen.stories';
import * as settings from './Settings.stories';
import * as signIn from './SignIn.stories';
import * as week from './WeekScreen.stories';

/**
 * Narrow-screen check (NFR-10): every screen state at the iPhone widths must fit with no sideways scroll.
 * `../index.css` is loaded so `.phone` fills the screen like the real app does (the 393 px frame is only for desktop mocks).
 */
const screens = [day, week, settings, signIn].flatMap((m) => Object.entries(composeStories(m as never) as Record<string, React.ComponentType>));

const meta = { title: 'Checks/Viewport', parameters: { layout: 'fullscreen', docs: { disable: true }, a11y: { test: 'off' } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const fits = (w: number): Story => ({
  name: `${w} px wide`,
  globals: { viewport: { value: `w${w}`, isRotated: false } },
  parameters: { viewport: { options: { [`w${w}`]: { name: `${w} px`, styles: { width: `${w}px`, height: '844px' }, type: 'mobile' } } } },
  render: () => <p>Checks every screen state at {w} px.</p>,
  play: async () => {
    const bad: string[] = [];
    await expect(document.documentElement.clientWidth).toBe(w);
    for (const [name, Screen] of screens) {
      const host = document.createElement('div');
      document.body.append(host);
      const root = createRoot(host);
      await act(async () => root.render(<Screen />));
      const el = document.documentElement;
      const body = host.querySelector('.phone-body');
      const wide = [...host.querySelectorAll('.phone *')].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > el.clientWidth + 0.5 || r.left < -0.5);
      });
      if (el.scrollWidth > el.clientWidth || (body && body.scrollWidth > body.clientWidth) || wide.length) bad.push(`${name} (${wide[0]?.className ?? 'page'})`);
      await act(async () => root.unmount());
      host.remove();
    }
    await expect(bad).toEqual([]);
  },
});

export const W320 = fits(320);
export const W375 = fits(375);
export const W390 = fits(390);
export const W393 = fits(393);
export const W430 = fits(430);
