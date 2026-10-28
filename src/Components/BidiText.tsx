import type { ReactNode } from 'react';
import { ui as styles } from './ui';

/** Isolate identifiers without reversing or altering their supplied content. */
export function BidiText({ children, direction = 'ltr' }: { children: ReactNode; direction?: 'ltr' | 'rtl' | 'auto' }) {
  return <bdi dir={direction} className={styles.bidi}>{children}</bdi>;
}
