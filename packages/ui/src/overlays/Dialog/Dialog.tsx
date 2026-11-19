'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Dialog.module.css';

export type DialogRootProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root> &
  ResponsiveVisibilityProps;

/** Owns the open state of a dialog. */
function DialogRoot({
  children,
  hiddenBelow,
  hiddenAbove,
  collapsedBelow,
  ...rest
}: DialogRootProps) {
  return (
    <span
      className={responsiveStyles.root}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
    >
      <DialogPrimitive.Root {...rest}>{children}</DialogPrimitive.Root>
    </span>
  );
}

export interface DialogTriggerProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>, ResponsiveVisibilityProps {}

/** Element that opens the dialog. */
export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest }, ref) {
    return (
      <DialogPrimitive.Trigger
        ref={ref}
        className={cn(styles.trigger, responsiveStyles.root, className)}
        {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
        {...rest}
      />
    );
  },
);

export type DialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;

/** Dimmed backdrop rendered behind the dialog content. */
export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(function DialogOverlay(
  { className, ...rest },
  ref,
) {
  return <DialogPrimitive.Overlay ref={ref} className={cn(styles.overlay, className)} {...rest} />;
});

export type DialogSize = 'sm' | 'md' | 'lg';

export interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, ResponsiveVisibilityProps {
  size?: DialogSize;
  /** Show the built-in accessible close button. */
  showClose?: boolean;
  /** Overlay class name, for consumers that need to style the backdrop. */
  overlayClassName?: string;
}

/** Modal dialog surface with an overlay, focus trap and Escape-to-close. */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  {
    size = 'md',
    showClose = true,
    overlayClassName,
    className,
    children,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn(styles.overlay, overlayClassName)} />
      <DialogPrimitive.Content
        ref={ref}
        data-size={size}
        className={cn(styles.content, styles[size], responsiveStyles.root, className)}
        {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
        {...rest}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close className={styles.close} aria-label="Close dialog">
            <span aria-hidden="true">×</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export type DialogTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

/** Accessible dialog name, announced when the dialog opens. */
export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(
  { className, ...rest },
  ref,
) {
  return <DialogPrimitive.Title ref={ref} className={cn(styles.title, className)} {...rest} />;
});

export type DialogDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

/** Optional dialog description linked via `aria-describedby`. */
export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription({ className, ...rest }, ref) {
    return (
      <DialogPrimitive.Description
        ref={ref}
        className={cn(styles.description, className)}
        {...rest}
      />
    );
  },
);

export type DialogSectionProps = HTMLAttributes<HTMLDivElement> & ResponsiveVisibilityProps;

const Section = (name: string) =>
  forwardRef<HTMLDivElement, DialogSectionProps>(function DialogSection(
    { className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn(styles[name], responsiveStyles.root, className)}
        {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
        {...rest}
      />
    );
  });

export const DialogHeader = Section('header');
export const DialogFooter = Section('footer');

export interface DialogCloseProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Close>, ResponsiveVisibilityProps {}

/** Element that closes the dialog. */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
  ref,
) {
  return (
    <DialogPrimitive.Close
      ref={ref}
      className={cn(styles.trigger, responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});

/** Compound dialog with Root, Trigger, Content, Title, Description and sections. */
export const Dialog = Object.assign(DialogRoot, {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Header: DialogHeader,
  Footer: DialogFooter,
  Close: DialogClose,
  Portal: DialogPrimitive.Portal,
});
