import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export function StarRating({ rating, onChange, size = 'md', readonly = false }: StarRatingProps) {
  const sizes = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  const iconSize = sizes[size];

  return (
    <div className="flex items-center gap-0.5">
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
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform focus:outline-none`}
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
