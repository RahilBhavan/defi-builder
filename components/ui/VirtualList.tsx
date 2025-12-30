/**
 * Virtual List Component
 * Efficiently renders large lists by only rendering visible items
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={largeArray}
 *   itemHeight={50}
 *   containerHeight={400}
 *   renderItem={(item, index) => <div key={index}>{item.name}</div>}
 * />
 * ```
 */

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * Virtual scrolling list component
 * Only renders visible items plus a buffer (overscan) for smooth scrolling
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return { startIndex, endIndex, totalHeight, offsetY };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, relativeIndex) => ({
      item,
      absoluteIndex: startIndex + relativeIndex,
    }));
  }, [items, startIndex, endIndex]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Reset scroll on items change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}
      className={className}
      role="list"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, absoluteIndex }) => (
            <div
              key={absoluteIndex}
              role="listitem"
              style={{
                minHeight: itemHeight,
                position: 'relative',
              }}
            >
              {renderItem(item, absoluteIndex)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

