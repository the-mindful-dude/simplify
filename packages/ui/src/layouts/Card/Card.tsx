import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { spacingVars, visibilityAttributes } from '../../internal/responsive';
import type {
  ResponsiveValue,
  ResponsiveVisibilityProps,
  SpacingValue,
} from '../../internal/responsive';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'elevated' | 'outline';

export interface CardProps extends HTMLAttributes<HTMLDivElement>, ResponsiveVisibilityProps {
  variant?: CardVariant;
  /** Inner padding, optionally overridden per breakpoint. */
  padding?: SpacingValue | ResponsiveValue<SpacingValue>;
  /** Enable hover/focus affordances for clickable cards. */
  interactive?: boolean;
}

export type CardSectionProps = HTMLAttributes<HTMLDivElement> & ResponsiveVisibilityProps;

const Section = (name: string) =>
  forwardRef<HTMLDivElement, CardSectionProps>(function CardSection(
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

export const CardHeader = Section('header');
export const CardBody = Section('body');
export const CardFooter = Section('footer');

const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'default',
    padding = '6',
    interactive = false,
    tabIndex,
    className,
    style,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-variant={variant}
      data-interactive={interactive || undefined}
      tabIndex={interactive ? (tabIndex ?? 0) : tabIndex}
      className={cn(
        styles.root,
        styles[variant],
        interactive && styles.interactive,
        responsiveStyles.root,
        className,
      )}
      style={{ ...spacingVars('--sd-card-padding', padding), ...style }}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});

/** A surface container with header, body and footer sections. */
export const Card = Object.assign(CardRoot, {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
