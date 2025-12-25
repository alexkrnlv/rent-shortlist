import { useRef, useState, useCallback, ReactNode } from 'react';

export type SnapPoint = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  children: ReactNode;
  isOpen?: boolean;
  onSnapChange?: (snap: SnapPoint) => void;
  initialSnap?: SnapPoint;
  peekContent?: ReactNode;
  className?: string;
}

// Snap point heights as percentage of viewport
const SNAP_HEIGHTS: Record<SnapPoint, number> = {
  peek: 18,
  half: 55,
  full: 92,
};

// Bottom navigation height + safe area
const BOTTOM_OFFSET = 60;

export function BottomSheet({
  children,
  isOpen = true,
  onSnapChange,
  initialSnap = 'peek',
  peekContent,
  className = '',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);
  const lastVelocity = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMoveY = useRef(0);

  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(initialSnap);
  const [sheetHeight, setSheetHeight] = useState(SNAP_HEIGHTS[initialSnap]);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Calculate actual height in pixels
  const getHeightFromPercent = useCallback((percent: number) => {
    const vh = window.innerHeight;
    return (vh * percent) / 100;
  }, []);

  // Find nearest snap point
  const getNearestSnap = useCallback((heightPercent: number, velocity: number): SnapPoint => {
    const snapPoints: SnapPoint[] = ['peek', 'half', 'full'];
    
    // If velocity is high enough, snap in direction of movement
    if (Math.abs(velocity) > 0.3) {
      if (velocity > 0) {
        // Moving down (closing)
        const currentIndex = snapPoints.indexOf(currentSnap);
        return snapPoints[Math.max(0, currentIndex - 1)];
      } else {
        // Moving up (opening)
        const currentIndex = snapPoints.indexOf(currentSnap);
        return snapPoints[Math.min(snapPoints.length - 1, currentIndex + 1)];
      }
    }

    // Otherwise, find nearest snap point
    let nearest: SnapPoint = 'peek';
    let minDiff = Infinity;

    for (const snap of snapPoints) {
      const diff = Math.abs(SNAP_HEIGHTS[snap] - heightPercent);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = snap;
      }
    }

    return nearest;
  }, [currentSnap]);

  // Animate to snap point
  const snapTo = useCallback((snap: SnapPoint) => {
    setCurrentSnap(snap);
    setSheetHeight(SNAP_HEIGHTS[snap]);
    onSnapChange?.(snap);
  }, [onSnapChange]);

  // Handle touch start on drag handle
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    dragStartHeight.current = sheetHeight;
    isDragging.current = true;
    lastMoveTime.current = Date.now();
    lastMoveY.current = touch.clientY;
    lastVelocity.current = 0;
    setIsDraggingState(true);
  }, [sheetHeight]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;

    const touch = e.touches[0];
    const deltaY = dragStartY.current - touch.clientY;
    const vh = window.innerHeight;
    const deltaPercent = (deltaY / vh) * 100;
    
    // Calculate velocity
    const now = Date.now();
    const timeDelta = now - lastMoveTime.current;
    if (timeDelta > 0) {
      const moveDelta = lastMoveY.current - touch.clientY;
      lastVelocity.current = moveDelta / timeDelta;
    }
    lastMoveTime.current = now;
    lastMoveY.current = touch.clientY;

    // Calculate new height with bounds
    let newHeight = dragStartHeight.current + deltaPercent;
    newHeight = Math.max(SNAP_HEIGHTS.peek, Math.min(SNAP_HEIGHTS.full, newHeight));
    
    setSheetHeight(newHeight);
  }, []);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    setIsDraggingState(false);

    const nearestSnap = getNearestSnap(sheetHeight, lastVelocity.current);
    snapTo(nearestSnap);
  }, [sheetHeight, getNearestSnap, snapTo]);

  // Handle drag handle tap to cycle snaps
  const handleDragHandleTap = useCallback(() => {
    // Only cycle if not dragging
    if (isDraggingState) return;
    
    const snapOrder: SnapPoint[] = ['peek', 'half', 'full'];
    const currentIndex = snapOrder.indexOf(currentSnap);
    const nextIndex = (currentIndex + 1) % snapOrder.length;
    snapTo(snapOrder[nextIndex]);
  }, [currentSnap, snapTo, isDraggingState]);

  if (!isOpen) return null;

  const heightPx = getHeightFromPercent(sheetHeight);

  return (
    <>
      {/* Backdrop - only visible when sheet is more than half open */}
      {sheetHeight > SNAP_HEIGHTS.half && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
          style={{ opacity: (sheetHeight - SNAP_HEIGHTS.half) / (SNAP_HEIGHTS.full - SNAP_HEIGHTS.half) }}
          onClick={() => snapTo('half')}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed left-0 right-0 z-50 bg-white dark:bg-gray-800 
          rounded-t-3xl shadow-2xl
          ${isDraggingState ? '' : 'transition-all duration-300 ease-out'}
          ${className}
        `}
        style={{
          bottom: `${BOTTOM_OFFSET}px`,
          height: `${heightPx}px`,
          maxHeight: `calc(92vh - ${BOTTOM_OFFSET}px)`,
          willChange: 'height',
        }}
      >
        {/* Drag Handle - Large touch area */}
        <div
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-start pt-2 cursor-grab active:cursor-grabbing"
          style={{ height: '44px', touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleDragHandleTap}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Content Container */}
        <div 
          className="flex flex-col"
          style={{ 
            height: `calc(100% - 44px)`,
            marginTop: '44px',
          }}
        >
          {/* Peek content - shown when in peek mode */}
          {peekContent && currentSnap === 'peek' && (
            <div className="px-4 py-2 flex-shrink-0">
              {peekContent}
            </div>
          )}

          {/* Scrollable content - visible when not peeking */}
          {currentSnap !== 'peek' && (
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
              }}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
