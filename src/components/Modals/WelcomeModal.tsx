import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, Bookmark, Link2 } from 'lucide-react';
import { getShareableUrl, copyToClipboard, markWelcomeModalSeen } from '../../utils/urlSession';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [copied, setCopied] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShareableUrl(getShareableUrl());
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareableUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      markWelcomeModalSeen();
    }
    onClose();
  };

  const handleSaveAndClose = () => {
    markWelcomeModalSeen();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Save Your Session" size="md">
      <div className="space-y-5">
        {/* Intro */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Link2 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Your data lives in the URL</h3>
            <p className="text-sm text-gray-600">
              All your properties are saved in the URL. Bookmark it to keep your shortlist, 
              or share it with friends and family!
            </p>
          </div>
        </div>

        {/* URL Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Your unique session URL:</label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <Button
              variant={copied ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleCopy}
              className="shrink-0 min-w-[100px]"
            >
              {copied ? (
                <>
                  <Check size={16} className="mr-1.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} className="mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-medium">
              1
            </div>
            <span>Copy the URL above or press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+D</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">⌘+D</kbd> to bookmark</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-medium">
              2
            </div>
            <span>Open this URL anytime to restore your property list</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-medium">
              3
            </div>
            <span>Share with others — they'll see the same properties!</span>
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600">Don't show this again</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={handleClose} className="flex-1">
            Skip for now
          </Button>
          <Button variant="primary" size="md" onClick={handleSaveAndClose} className="flex-1">
            <Bookmark size={16} className="mr-1.5" />
            I've saved it
          </Button>
        </div>
      </div>
    </Modal>
  );
}

