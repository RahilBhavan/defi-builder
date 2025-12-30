/**
 * Virtual Table Component
 * Efficiently renders large table rows by only rendering visible items
 * Works with HTML table structure (tbody > tr)
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface VirtualTableContextValue {
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
}

const VirtualTableContext = createContext<VirtualTableContextValue | null>(null);

export interface VirtualTableProps<T> {
  items: T[];
  rowHeight: number;
  containerHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  'aria-label'?: string;
}

/**
 * Virtual scrolling table component
 * Only renders visible rows plus a buffer (overscan) for smooth scrolling
 * Use this inside a <tbody> element within VirtualTableContainer
 */
export function VirtualTable<T>({
  items,
  rowHeight,
  containerHeight,
  renderRow,
  overscan = 5,
  'aria-label': ariaLabel,
}: VirtualTableProps<T>) {
  const context = useContext(VirtualTableContext);
  if (!context) {
    throw new Error('VirtualTable must be used inside VirtualTableContainer');
  }

  const { scrollTop } = context;

  // Calculate visible range
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const totalHeight = items.length * rowHeight;
    const offsetY = startIndex * rowHeight;

    return { startIndex, endIndex, totalHeight, offsetY };
  }, [scrollTop, containerHeight, rowHeight, items.length, overscan]);

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, relativeIndex) => ({
      item,
      absoluteIndex: startIndex + relativeIndex,
    }));
  }, [items, startIndex, endIndex]);

  // Reset scroll on items change
  useEffect(() => {
    context.setScrollTop(0);
  }, [items.length, context]);

  return (
    <>
      {/* Spacer row to maintain scroll height */}
      {startIndex > 0 && (
        <tr aria-hidden="true">
          <td colSpan={100} style={{ height: offsetY, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
      {/* Visible rows */}
      {visibleItems.map(({ item, absoluteIndex }) => (
        <React.Fragment key={absoluteIndex}>{renderRow(item, absoluteIndex)}</React.Fragment>
      ))}
      {/* Spacer row at the end */}
      {endIndex < items.length - 1 && (
        <tr aria-hidden="true">
          <td
            colSpan={100}
            style={{
              height: totalHeight - (endIndex + 1) * rowHeight,
              padding: 0,
              border: 0,
              lineHeight: 0,
            }}
          />
        </tr>
      )}
    </>
  );
}

/**
 * Virtual Table Container
 * Wraps a table with virtual scrolling support
 */
export function VirtualTableContainer({
  children,
  height,
}: {
  children: React.ReactNode;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const contextValue = useMemo(
    () => ({
      scrollTop,
      setScrollTop,
    }),
    [scrollTop]
  );

  return (
    <VirtualTableContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height,
          overflowY: 'auto',
          overflowX: 'auto',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </VirtualTableContext.Provider>
  );
}

