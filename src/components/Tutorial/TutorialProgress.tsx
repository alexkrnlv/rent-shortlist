import { useTutorialProgress } from '../../store/useTutorialStore';

interface TutorialProgressProps {
  className?: string;
}

export function TutorialProgress({ className = '' }: TutorialProgressProps) {
  const { current, total } = useTutorialProgress();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-gray-500">
        Step {current} of {total}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`
              h-1.5 rounded-full transition-all duration-300 ease-out
              ${index < current 
                ? 'w-6 bg-primary-600' 
                : index === current 
                  ? 'w-6 bg-primary-300' 
                  : 'w-1.5 bg-gray-200'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}

// Alternative dot-style progress indicator
export function TutorialProgressDots({ className = '' }: TutorialProgressProps) {
  const { current, total } = useTutorialProgress();

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          className={`
            w-2.5 h-2.5 rounded-full transition-all duration-300 ease-out
            ${index + 1 === current 
              ? 'bg-primary-600 scale-125' 
              : index + 1 < current 
                ? 'bg-primary-400' 
                : 'bg-gray-300'
            }
          `}
          aria-label={`Step ${index + 1}`}
        />
      ))}
    </div>
  );
}
