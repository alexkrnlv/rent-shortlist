import { Loader2, X, AlertCircle, ExternalLink } from 'lucide-react';
import type { PendingProperty } from '../../store/usePropertyStore';

interface PendingPropertyCardProps {
  pending: PendingProperty;
  onDismiss: () => void;
}

export function PendingPropertyCard({ pending, onDismiss }: PendingPropertyCardProps) {
  const isProcessing = pending.status === 'processing';
  const isFailed = pending.status === 'failed';

  // Extract domain from URL for display
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'property';
    }
  };

  return (
    <div
      className={`
        relative rounded-xl border-2 border-dashed p-4
        ${isProcessing ? 'border-violet-300 bg-violet-50/50' : 'border-red-300 bg-red-50/50'}
        transition-all duration-300
      `}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600"
        title="Dismiss"
      >
        <X size={16} />
      </button>

      {/* Content */}
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
          ${isProcessing ? 'bg-violet-100' : 'bg-red-100'}
        `}>
          {isProcessing ? (
            <Loader2 size={24} className="text-violet-500 animate-spin" />
          ) : (
            <AlertCircle size={24} className="text-red-500" />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              text-xs font-medium px-2 py-0.5 rounded-full
              ${isProcessing ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'}
            `}>
              {isProcessing ? 'Processing...' : 'Failed'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-1 truncate">
            {getDomain(pending.url)}
          </p>

          {isFailed && pending.error && (
            <p className="text-xs text-red-600 mb-2">
              {pending.error}
            </p>
          )}

          {isProcessing && (
            <p className="text-xs text-gray-500">
              AI is analyzing the listing...
            </p>
          )}

          {/* Link to original */}
          <a
            href={pending.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 mt-2"
          >
            View listing <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Processing animation bar */}
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-100 rounded-b-xl overflow-hidden">
          <div className="h-full bg-violet-400 animate-pulse" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}

