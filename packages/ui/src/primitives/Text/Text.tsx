import { createElement, forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Text.module.css';

export type TextElement = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'small';
export type TextVariant = 'body' | 'lead' | 'caption' | 'code' | 'label';
export type TextTone = 'default' | 'muted' | 'subtle';
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextProps extends HTMLAttributes<HTMLElement>, ResponsiveVisibilityProps {
  /** Semantic element to render. */
  as?: TextElement;
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextWeight;
  /** Clip a single line with an ellipsis. */
  truncate?: boolean;
}

/** Semantic typography rendered entirely from the typography tokens. */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as = 'p',
    variant = 'body',
    tone = 'default',
    weight = 'regular',
    truncate = false,
    className,
    children,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  return createElement(
    as,
    {
      ref,
      className: cn(
        styles.root,
        styles[variant],
        styles[tone],
        styles[weight],
        truncate && styles.truncate,
        responsiveStyles.root,
        className,
      ),
      'data-variant': variant,
      'data-tone': tone,
      ...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow }),
      ...rest,
    },
    children,
  );
});
