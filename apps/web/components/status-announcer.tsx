'use client';

import { useEffect, useRef, useState } from 'react';

import styles from '../styles/status.module.css';

/** Polite live region for status changes; silent on first render. */
export function StatusAnnouncer({ message }: { readonly message: string }) {
  const previous = useRef<string | null>(null);
  const [announced, setAnnounced] = useState('');

  useEffect(() => {
    if (previous.current === null) {
      previous.current = message;
      return;
    }
    if (previous.current !== message) {
      previous.current = message;
      setAnnounced(message);
    }
  }, [message]);

  return (
    <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
      {announced}
    </div>
  );
}
