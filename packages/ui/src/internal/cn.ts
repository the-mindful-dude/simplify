export type ClassValue = string | false | null | undefined;

/** Join truthy class names without pulling in a class-name dependency. */
export function cn(...values: ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
}
