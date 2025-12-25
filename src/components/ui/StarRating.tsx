import { Star } from 'lucide-react';
import { useMobileDetect } from '../../hooks/useMobileDetect';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export function StarRating({ rating, onChange, size = 'md', readonly = false }: StarRatingProps) {
  const isMobile = useMobileDetect();
  
  // Larger sizes for mobile touch targets
  const sizes = {
    sm: isMobile ? 20 : 14,
    md: isMobile ? 24 : 18,
    lg: isMobile ? 28 : 24,
  };

  const iconSize = sizes[size];

  // Minimum touch target padding on mobile
  const touchPadding = isMobile ? 'p-1.5' : '';

  return (
    <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-0.5'}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => {
            if (!readonly && onChange) {
              // Toggle off if clicking the same star
              onChange(rating === star ? 0 : star);
            }
          }}
          disabled={readonly}
          className={`
            ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'} 
            transition-transform focus:outline-none
            ${touchPadding}
            ${isMobile && !readonly ? 'min-w-[44px] min-h-[44px] flex items-center justify-center -m-1.5' : ''}
          `}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            size={iconSize}
            className={`transition-colors ${
              rating !== null && star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-gray-300 dark:text-gray-600'
            } ${!readonly && 'hover:text-amber-400'}`}
          />
        </button>
      ))}
    </div>
  );
}
