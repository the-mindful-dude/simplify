'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Tabs.module.css';

export interface TabsRootProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Root>, ResponsiveVisibilityProps {}

/** Owns the selected tab and renders the tab set. */
export const TabsRoot = forwardRef<HTMLDivElement, TabsRootProps>(function TabsRoot(
  { className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
  ref,
) {
  return (
    <TabsPrimitive.Root
      ref={ref}
      className={cn(styles.root, responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});

export type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List>;

/** Row of tab triggers with roving keyboard focus. */
export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, ...rest },
  ref,
) {
  return <TabsPrimitive.List ref={ref} className={cn(styles.list, className)} {...rest} />;
});

export type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>;

/** Selectable tab control. */
export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { className, ...rest },
  ref,
) {
  return <TabsPrimitive.Trigger ref={ref} className={cn(styles.trigger, className)} {...rest} />;
});

export type TabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Content>;

/** Panel associated with a tab trigger. */
export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(function TabsContent(
  { className, ...rest },
  ref,
) {
  return <TabsPrimitive.Content ref={ref} className={cn(styles.content, className)} {...rest} />;
});

/** Compound, accessible tabs built on Radix. */
export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
