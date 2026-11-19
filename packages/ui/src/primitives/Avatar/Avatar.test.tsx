import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage, AvatarRoot } from './Avatar';

const nativeImage = window.Image;

afterEach(() => {
  window.Image = nativeImage;
  cleanup();
});

type ImageOutcome = 'load' | 'error';

/**
 * jsdom never fetches or decodes images, so Radix's `new Image()` stays in the
 * `loading` state and its `<img>` is never rendered. Model only that browser
 * boundary: the stub reaches a terminal state and emits the same `load`/`error`
 * event a real image would, leaving Radix to drive the actual rendering.
 */
function stubImageLoading(outcome: ImageOutcome): void {
  class ImageStub extends EventTarget {
    complete = false;
    naturalWidth = 0;
    decoding = 'async';
    crossOrigin: string | null = null;
    referrerPolicy = '';
    private currentSrc = '';

    get src(): string {
      return this.currentSrc;
    }

    set src(value: string) {
      this.currentSrc = value;
      queueMicrotask(() => {
        this.complete = true;
        this.naturalWidth = outcome === 'load' ? 1 : 0;
        this.dispatchEvent(new Event(outcome));
      });
    }
  }

  window.Image = ImageStub as unknown as typeof Image;
}

describe('Avatar', () => {
  it('shows the fallback when no image is supplied and forwards ref and className', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar ref={ref} className="custom" fallback="AB" size="lg" />);

    const root = screen.getByText('AB').parentElement;
    expect(root).toHaveClass('custom');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(ref.current).toBe(root);
  });

  it('renders an accessible image when a source is supplied', async () => {
    stubImageLoading('load');
    render(<Avatar src="/avatar.png" alt="Ada Lovelace" fallback="AL" delayMs={0} />);

    const image = await screen.findByRole('img', { name: 'Ada Lovelace' });
    expect(image).toHaveAttribute('src', '/avatar.png');
    expect(screen.queryByText('AL')).not.toBeInTheDocument();
  });

  it('keeps the fallback visible when the image fails to load', async () => {
    stubImageLoading('error');
    render(<Avatar src="/broken.png" alt="Ada Lovelace" fallback="AL" />);

    await waitFor(() => expect(screen.getByText('AL')).toBeInTheDocument());
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('exposes Radix-backed parts for custom composition', async () => {
    stubImageLoading('load');
    render(
      <AvatarRoot size="sm">
        <AvatarImage src="/user.png" alt="User" />
        <AvatarFallback>U</AvatarFallback>
      </AvatarRoot>,
    );

    expect(await screen.findByRole('img', { name: 'User' })).toHaveAttribute('src', '/user.png');
    expect(screen.queryByText('U')).not.toBeInTheDocument();
  });
});
