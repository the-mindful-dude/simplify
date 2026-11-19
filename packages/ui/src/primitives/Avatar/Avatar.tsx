'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarRootProps
  extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, ResponsiveVisibilityProps {
  size?: AvatarSize;
}

/** Radix avatar root with token-driven sizing. */
export const AvatarRoot = forwardRef<HTMLSpanElement, AvatarRootProps>(function AvatarRoot(
  { size = 'md', className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
  ref,
) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      data-size={size}
      className={cn(styles.root, styles[size], responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});

/** Radix avatar image; the fallback is shown automatically while it cannot load. */
export const AvatarImage = forwardRef<
  HTMLImageElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...rest }, ref) {
  return <AvatarPrimitive.Image ref={ref} className={cn(styles.image, className)} {...rest} />;
});

/** Radix avatar fallback rendered when the image is missing or fails to load. */
export const AvatarFallback = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(function AvatarFallback({ className, ...rest }, ref) {
  return (
    <AvatarPrimitive.Fallback ref={ref} className={cn(styles.fallback, className)} {...rest} />
  );
});

export interface AvatarProps extends AvatarRootProps {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  /** Delay before the fallback appears, in milliseconds. */
  delayMs?: number;
  imageLoading?: 'eager' | 'lazy';
}

const AvatarBase = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, alt = '', fallback, delayMs, imageLoading = 'eager', children, ...rest },
  ref,
) {
  return (
    <AvatarRoot ref={ref} {...rest}>
      {children ?? (
        <>
          {src !== undefined ? (
            <AvatarImage
              src={src}
              {...(alt !== undefined ? { alt } : {})}
              {...(imageLoading !== undefined ? { loading: imageLoading } : {})}
            />
          ) : null}
          <AvatarFallback delayMs={delayMs}>{fallback}</AvatarFallback>
        </>
      )}
    </AvatarRoot>
  );
});

/** Avatar with a convenient `src`/`fallback` API and Radix-backed parts. */
export const Avatar = Object.assign(AvatarBase, {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
});
