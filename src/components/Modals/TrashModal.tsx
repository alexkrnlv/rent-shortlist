import { useState } from 'react';
import { Trash2, RotateCcw, MapPin, ExternalLink, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { usePropertyStore, DeletedProperty } from '../../store/usePropertyStore';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function TrashModal({ isOpen, onClose }: TrashModalProps) {
  const { deletedProperties, restoreProperty, permanentlyDeleteProperty, emptyTrash } = usePropertyStore();
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

  const handleRestore = (id: string) => {
    restoreProperty(id);
  };

  const handlePermanentDelete = (id: string) => {
    setPropertyToDelete(id);
  };

  const confirmPermanentDelete = () => {
    if (propertyToDelete) {
      permanentlyDeleteProperty(propertyToDelete);
      setPropertyToDelete(null);
    }
  };

  const handleEmptyTrash = () => {
    setConfirmEmptyTrash(true);
  };

  const confirmEmptyTrashAction = () => {
    emptyTrash();
    setConfirmEmptyTrash(false);
  };

  // Sort by deletion time, most recent first
  const sortedDeletedProperties = [...deletedProperties].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Trash Bin" size="lg">
        <div className="space-y-4">
          {/* Info text */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Deleted properties are stored here. You can restore them or permanently delete them.
            </p>
          </div>

          {/* Empty state */}
          {sortedDeletedProperties.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Trash2 size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trash is empty
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Deleted properties will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Header with count and empty button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {sortedDeletedProperties.length}
                  </span>{' '}
                  deleted {sortedDeletedProperties.length === 1 ? 'property' : 'properties'}
                </p>
                <Button variant="ghost" size="sm" onClick={handleEmptyTrash} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30">
                  <Trash2 size={14} className="mr-1.5" />
                  Empty Trash
                </Button>
              </div>

              {/* Deleted properties list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {sortedDeletedProperties.map((property: DeletedProperty) => (
                  <div
                    key={property.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 flex-shrink-0 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                      {property.thumbnail ? (
                        <img
                          src={property.thumbnail}
                          alt={property.name}
                          className="w-full h-full object-cover opacity-70"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin size={20} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Property info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {property.name || 'Untitled Property'}
                        </h4>
                        {property.url && (
                          <a
                            href={property.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {property.address || 'No address'}
                        </p>
                        {property.price && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {property.price}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        Deleted {formatTimeAgo(property.deletedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleRestore(property.id)}
                        className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                        title="Restore property"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(property.id)}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Confirm permanent delete */}
      <ConfirmDialog
        isOpen={propertyToDelete !== null}
        onClose={() => setPropertyToDelete(null)}
        onConfirm={confirmPermanentDelete}
        title="Delete Permanently?"
        message="This property will be permanently deleted and cannot be recovered."
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Confirm empty trash */}
      <ConfirmDialog
        isOpen={confirmEmptyTrash}
        onClose={() => setConfirmEmptyTrash(false)}
        onConfirm={confirmEmptyTrashAction}
        title="Empty Trash?"
        message={`This will permanently delete ${sortedDeletedProperties.length} ${sortedDeletedProperties.length === 1 ? 'property' : 'properties'}. This action cannot be undone.`}
        confirmText="Empty Trash"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
