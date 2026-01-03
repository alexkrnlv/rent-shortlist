import { Fragment, ReactNode, useRef, useCallback, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { useMobileDetect } from '../../hooks/useMobileDetect';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideHeader?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', hideHeader = false }: ModalProps) {
  const isMobile = useMobileDetect();
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Reset drag state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Handle swipe to dismiss on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const content = contentRef.current;
    
    // Only allow drag from the header area or when scrolled to top
    const isAtTop = !content || content.scrollTop <= 0;
    const target = e.target as HTMLElement;
    const isHeader = target.closest('[data-modal-header]');
    
    if (isHeader || isAtTop) {
      dragStartY.current = touch.clientY;
      dragStartScrollTop.current = content?.scrollTop || 0;
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || dragStartY.current === 0) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    
    // Only drag down, not up
    if (deltaY > 0 && dragStartScrollTop.current <= 0) {
      setIsDragging(true);
      setDragY(deltaY);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    // If dragged more than 100px, close modal
    if (dragY > 100) {
      onClose();
    }
    
    setDragY(0);
    setIsDragging(false);
    dragStartY.current = 0;
  }, [isMobile, dragY, onClose]);

  // Mobile full-screen modal
  if (isMobile) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-full"
            >
              <Dialog.Panel 
                className="h-full w-full bg-white dark:bg-gray-800 flex flex-col"
                style={{
                  transform: isDragging ? `translateY(${dragY}px)` : undefined,
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Swipe indicator */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>

                {/* Header */}
                {!hideHeader && (
                  <div 
                    data-modal-header
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title || ''}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      aria-label="Close modal"
                      className="w-10 h-10 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                    >
                      <X size={22} />
                    </button>
                  </div>
                )}

                {/* Scrollable content */}
                <div 
                  ref={contentRef}
                  className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                >
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // Desktop centered modal
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full ${sizes[size]} transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all`}>
                {!hideHeader && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title || ''}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      aria-label="Close modal"
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
                <div className={hideHeader ? "p-6" : "px-6 py-4"}>{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
