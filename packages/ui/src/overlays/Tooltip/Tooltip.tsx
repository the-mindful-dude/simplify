'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Tooltip.module.css';

export type TooltipProviderProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>;

/** Shared tooltip timing provider for consumers that want one global setting. */
export function TooltipProvider({
  delayDuration = 200,
  skipDelayDuration = 300,
  ...rest
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...rest}
    />
  );
}

export interface TooltipRootProps
  extends ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, ResponsiveVisibilityProps {
  /** Delay before the tooltip opens, in milliseconds. */
  delayDuration?: number;
  skipDelayDuration?: number;
}

/**
 * Tooltip root. It supplies its own Radix provider so a global provider is not
 * required; consumers may still use `Tooltip.Provider` for shared timing.
 */
function TooltipRoot({
  children,
  delayDuration = 200,
  skipDelayDuration = 300,
  hiddenBelow,
  hiddenAbove,
  collapsedBelow,
  ...rest
}: TooltipRootProps) {
  return (
    <span
      className={responsiveStyles.root}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
    >
      <TooltipPrimitive.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
      >
        <TooltipPrimitive.Root {...rest}>{children}</TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    </span>
  );
}

export interface TooltipTriggerProps
  extends ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>, ResponsiveVisibilityProps {}

/** Element that reveals the tooltip on hover or keyboard focus. */
export const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  function TooltipTrigger({ className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest }, ref) {
    return (
      <TooltipPrimitive.Trigger
        ref={ref}
        className={cn(styles.trigger, responsiveStyles.root, className)}
        {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
        {...rest}
      />
    );
  },
);

export interface TooltipContentProps extends ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Content
> {
  /** Render the pointing arrow. */
  showArrow?: boolean;
}

/** Floating tooltip surface rendered in a portal. */
export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent({ className, children, sideOffset = 6, showArrow = true, ...rest }, ref) {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(styles.content, className)}
          {...rest}
        >
          {children}
          {showArrow ? (
            <TooltipPrimitive.Arrow className={styles.arrow} width={10} height={5} />
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);

/** Compound tooltip with a self-contained provider and Radix keyboard behavior. */
export const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipPrimitive.Arrow,
  Portal: TooltipPrimitive.Portal,
});
