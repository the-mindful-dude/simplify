'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './DropdownMenu.module.css';

export type DropdownMenuRootProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> &
  ResponsiveVisibilityProps;

/** Owns the open state of a dropdown menu. */
function DropdownMenuRoot({
  children,
  hiddenBelow,
  hiddenAbove,
  collapsedBelow,
  ...rest
}: DropdownMenuRootProps) {
  return (
    <span
      className={responsiveStyles.root}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
    >
      <DropdownMenuPrimitive.Root {...rest}>{children}</DropdownMenuPrimitive.Root>
    </span>
  );
}

export interface DropdownMenuTriggerProps
  extends
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>,
    ResponsiveVisibilityProps {}

/** Element that opens the menu. */
export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  function DropdownMenuTrigger(
    { className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
    ref,
  ) {
    return (
      <DropdownMenuPrimitive.Trigger
        ref={ref}
        className={cn(styles.trigger, responsiveStyles.root, className)}
        {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
        {...rest}
      />
    );
  },
);

export type DropdownMenuContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
>;

/** Floating menu surface rendered in a portal. */
export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent({ className, sideOffset = 6, ...rest }, ref) {
    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(styles.content, className)}
          {...rest}
        />
      </DropdownMenuPrimitive.Portal>
    );
  },
);

export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  /** Use the destructive color role. */
  destructive?: boolean;
}

/** Selectable menu action. */
export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  function DropdownMenuItem({ className, destructive = false, ...rest }, ref) {
    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        data-destructive={destructive || undefined}
        className={cn(styles.item, destructive && styles.destructive, className)}
        {...rest}
      />
    );
  },
);

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownMenuLabel({ className, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.Label ref={ref} className={cn(styles.label, className)} {...rest} />
  );
});

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn(styles.separator, className)}
      {...rest}
    />
  );
});

export const DropdownMenuGroup = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>
>(function DropdownMenuGroup({ className, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.Group ref={ref} className={cn(styles.group, className)} {...rest} />
  );
});

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(styles.item, styles.checkable, className)}
      {...rest}
    >
      <span className={styles.indicatorSlot} aria-hidden="true">
        <DropdownMenuPrimitive.ItemIndicator>✓</DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

export const DropdownMenuRadioGroup = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>
>(function DropdownMenuRadioGroup({ className, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.RadioGroup ref={ref} className={cn(styles.group, className)} {...rest} />
  );
});

export const DropdownMenuRadioItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(styles.item, styles.checkable, className)}
      {...rest}
    >
      <span className={styles.indicatorSlot} aria-hidden="true">
        <DropdownMenuPrimitive.ItemIndicator>✓</DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});

export type DropdownMenuShortcutProps = HTMLAttributes<HTMLSpanElement>;

/** Keyboard shortcut hint displayed at the end of a menu item. */
export const DropdownMenuShortcut = forwardRef<HTMLSpanElement, DropdownMenuShortcutProps>(
  function DropdownMenuShortcut({ className, ...rest }, ref) {
    return <span ref={ref} className={cn(styles.shortcut, className)} {...rest} />;
  },
);

export const DropdownMenuSubTrigger = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>
>(function DropdownMenuSubTrigger({ className, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(styles.item, styles.subTrigger, className)}
      {...rest}
    />
  );
});

export const DropdownMenuSubContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(function DropdownMenuSubContent({ className, ...rest }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={cn(styles.content, className)}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

/** Compound, keyboard-accessible dropdown menu built on Radix. */
export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Portal: DropdownMenuPrimitive.Portal,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Group: DropdownMenuGroup,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  Shortcut: DropdownMenuShortcut,
  Sub: DropdownMenuPrimitive.Sub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
});
