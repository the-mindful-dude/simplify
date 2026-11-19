'use client';

import { forwardRef, useId } from 'react';
import type { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './InputField.module.css';

export type InputFieldSize = 'sm' | 'md' | 'lg';

/** Class names applied to each part of the field. */
export interface InputFieldSlots {
  root?: string;
  label?: string;
  description?: string;
  control?: string;
  input?: string;
  leading?: string;
  trailing?: string;
  error?: string;
}

/** Native props forwarded to each rendered part of the field. */
export interface InputFieldSlotProps {
  root?: HTMLAttributes<HTMLDivElement>;
  label?: LabelHTMLAttributes<HTMLLabelElement>;
  description?: HTMLAttributes<HTMLParagraphElement>;
  control?: HTMLAttributes<HTMLDivElement>;
  input?: InputHTMLAttributes<HTMLInputElement>;
  leading?: HTMLAttributes<HTMLSpanElement>;
  trailing?: HTMLAttributes<HTMLSpanElement>;
  error?: HTMLAttributes<HTMLParagraphElement>;
}

export interface InputFieldProps
  extends
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    ResponsiveVisibilityProps {
  label?: ReactNode;
  description?: ReactNode;
  /** Validation message; also switches the field to its invalid presentation. */
  error?: ReactNode;
  /** Force the invalid presentation even without a validation message. */
  invalid?: boolean;
  size?: InputFieldSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  slots?: InputFieldSlots;
  slotProps?: InputFieldSlotProps;
}

/** A labelled text input with accessible description and validation messaging. */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  {
    label,
    description,
    error,
    invalid = false,
    size = 'md',
    leading,
    trailing,
    slots,
    slotProps,
    className,
    id,
    required = false,
    'aria-describedby': describedByProp,
    'aria-invalid': ariaInvalidProp,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `sd-input-${generatedId}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const isInvalid = invalid || (error !== undefined && error !== null);
  const describedBy =
    [
      describedByProp,
      description !== undefined && description !== null ? descriptionId : null,
      error !== undefined && error !== null ? errorId : null,
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ') || undefined;

  return (
    <div
      {...slotProps?.root}
      data-invalid={isInvalid || undefined}
      data-size={size}
      className={cn(
        styles.root,
        responsiveStyles.root,
        slots?.root,
        slotProps?.root?.className,
        className,
      )}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
    >
      {label !== undefined && label !== null ? (
        <label
          {...slotProps?.label}
          htmlFor={inputId}
          className={cn(styles.label, slots?.label, slotProps?.label?.className)}
        >
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {description !== undefined && description !== null ? (
        <p
          {...slotProps?.description}
          id={descriptionId}
          className={cn(styles.description, slots?.description, slotProps?.description?.className)}
        >
          {description}
        </p>
      ) : null}

      <div
        {...slotProps?.control}
        className={cn(styles.control, slots?.control, slotProps?.control?.className)}
      >
        {leading !== undefined && leading !== null ? (
          <span
            {...slotProps?.leading}
            aria-hidden="true"
            className={cn(styles.leading, slots?.leading, slotProps?.leading?.className)}
          >
            {leading}
          </span>
        ) : null}

        <input
          {...rest}
          {...slotProps?.input}
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            styles.input,
            styles[size],
            isInvalid && styles.invalid,
            slots?.input,
            slotProps?.input?.className,
          )}
          aria-invalid={isInvalid || ariaInvalidProp || undefined}
          aria-describedby={describedBy}
        />

        {trailing !== undefined && trailing !== null ? (
          <span
            {...slotProps?.trailing}
            className={cn(styles.trailing, slots?.trailing, slotProps?.trailing?.className)}
          >
            {trailing}
          </span>
        ) : null}
      </div>

      {error !== undefined && error !== null ? (
        <p
          {...slotProps?.error}
          id={errorId}
          role="alert"
          className={cn(styles.error, slots?.error, slotProps?.error?.className)}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});
