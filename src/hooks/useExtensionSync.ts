import { useEffect, useCallback, useRef } from 'react';
import { usePropertyStore } from '../store/usePropertyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { processProperty } from '../services/propertyProcessor';
import { generateId } from '../utils/helpers';
import type { Property } from '../types';

interface PendingProperty {
  id: string;
  url: string;
  title: string;
  address: string;
  thumbnail: string;
  isBTR: boolean;
  tags: string[];
  addedAt: string;
}

export function useExtensionSync() {
  const { addProperty, tags } = usePropertyStore();
  const { settings } = useSettingsStore();
  const lastSyncedTags = useRef<string>('');
  const isProcessing = useRef(false);
  const processingIds = useRef<Set<string>>(new Set());
  const processedUrls = useRef<Set<string>>(new Set());

  // Sync tags to server whenever they change
  useEffect(() => {
    const tagsJson = JSON.stringify(tags);
    if (tagsJson !== lastSyncedTags.current) {
      lastSyncedTags.current = tagsJson;
      fetch('http://localhost:3001/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      }).catch(() => {
        // Silently fail if server not running
      });
    }
  }, [tags]);

  const processPendingProperties = useCallback(async () => {
    // Prevent concurrent executions
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      const response = await fetch('http://localhost:3001/api/pending-properties');
      if (!response.ok) {
        isProcessing.current = false;
        return;
      }

      const pending: PendingProperty[] = await response.json();

      for (const item of pending) {
        // Skip if already processing this item or if URL was already processed
        if (processingIds.current.has(item.id)) continue;
        if (processedUrls.current.has(item.url)) {
          // Already processed this URL, just mark as processed on server
          await fetch('http://localhost:3001/api/mark-processed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id }),
          });
          continue;
        }

        // Mark as being processed locally
        processingIds.current.add(item.id);
        processedUrls.current.add(item.url);

        try {
          // Process the property to get coordinates and distances
          const propertyData = await processProperty(
            item.url,
            settings.claudeApiKey,
            settings.centerPoint
          );

          if (propertyData.coordinates) {
            const property: Property = {
              id: generateId(),
              url: item.url,
              name: propertyData.name || item.title || 'Property',
              address: propertyData.address || item.address || '',
              thumbnail: propertyData.thumbnail || item.thumbnail,
              images: propertyData.images,
              coordinates: propertyData.coordinates,
              distances: propertyData.distances,
              comment: '',
              rating: null,
              isBTR: item.isBTR,
              tags: item.tags || [],
              createdAt: item.addedAt,
            };

            addProperty(property);
          }

          // Mark as processed on server
          await fetch('http://localhost:3001/api/mark-processed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id }),
          });
        } catch (error) {
          console.error('Error processing extension property:', error);
          // Still mark as processed to avoid infinite retries
          await fetch('http://localhost:3001/api/mark-processed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id }),
          });
        } finally {
          // Remove from local processing set
          processingIds.current.delete(item.id);
        }
      }
    } catch (error) {
      // Silently fail - server might not be running
    } finally {
      isProcessing.current = false;
    }
  }, [addProperty, settings.claudeApiKey, settings.centerPoint]);

  useEffect(() => {
    // Initial check
    processPendingProperties();

    // Poll every 5 seconds
    const interval = setInterval(processPendingProperties, 5000);

    return () => clearInterval(interval);
  }, [processPendingProperties]);
}
