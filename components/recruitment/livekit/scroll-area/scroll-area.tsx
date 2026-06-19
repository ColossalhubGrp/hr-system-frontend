'use client';

import { forwardRef, useCallback, useRef } from 'react';
import { useAutoScroll } from '@/components/recruitment/livekit/scroll-area/hooks/useAutoScroll';
import { cn } from '@/lib/cn';

interface ScrollAreaProps {
  children?: React.ReactNode;
  className?: string;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { className, children },
  ref
) {
  // React 18 typings make RefObject<T>.current readonly when initialized
  // with non-null T; widen to T | null so the merged-ref handler below
  // can write to it. React 19 dropped this distinction.
  const scrollContentRef = useRef<HTMLDivElement | null>(null);

  useAutoScroll(scrollContentRef.current);

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollContentRef.current = node;

      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  return (
    <div ref={mergedRef} className={cn('overflow-y-scroll scroll-smooth', className)}>
      <div>{children}</div>
    </div>
  );
});


