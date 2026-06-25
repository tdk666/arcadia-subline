import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareNative, share } from './share';

// l'analytics est best-effort et hors sujet ici : on la neutralise
vi.mock('./analytics', () => ({ track: () => {} }));

const realNavigator = globalThis.navigator;

afterEach(() => {
  vi.unstubAllGlobals();
  if (realNavigator) vi.stubGlobal('navigator', realNavigator);
});

describe('share', () => {
  it('detects native share availability', () => {
    vi.stubGlobal('navigator', { share: () => Promise.resolve() });
    expect(canShareNative()).toBe(true);
    vi.stubGlobal('navigator', {});
    expect(canShareNative()).toBe(false);
  });

  it('uses the native sheet when available', async () => {
    const shareFn = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share: shareFn });
    const r = await share({ title: 'T', text: 'hello' });
    expect(r).toBe('shared');
    expect(shareFn).toHaveBeenCalledOnce();
  });

  it('treats a user-cancelled sheet as success, not a fallback', async () => {
    const abort = () => Promise.reject(new DOMException('x', 'AbortError'));
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share: abort, clipboard: { writeText } });
    const r = await share({ title: 'T', text: 'hello' });
    expect(r).toBe('shared');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when no native share', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const r = await share({ title: 'T', text: 'hello', url: 'https://x.test' });
    expect(r).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hello https://x.test');
  });

  it('reports unavailable when neither path works', async () => {
    vi.stubGlobal('navigator', {});
    const r = await share({ title: 'T', text: 'hello' });
    expect(r).toBe('unavailable');
  });
});
