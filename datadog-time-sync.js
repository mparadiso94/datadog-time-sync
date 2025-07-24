// ==UserScript==
// @name         Datadog Timestamp Sync
// @namespace    http://tampermonkey.net/
// @version      1.29
// @description  Sync timestamps across all Datadog tabs
// @author       You
// @match        *://app.datadoghq.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    // Create sync button integrated with Datadog's time picker
    function createSyncButton() {
        
        // Find the time picker container
        const timePicker = document.querySelector('[data-dd-action-name="druids_time_date-range-picker"]');
        if (!timePicker) {
            setTimeout(createSyncButton, 2000);
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('dd-timestamp-sync-btn')) {
            return;
        }
        
        // Create button with Datadog's design system classes
        const button = document.createElement('button');
        button.id = 'dd-timestamp-sync-btn';
        button.innerHTML = `
            <div class="druids_form_button__icon-wrapper">
                <span style="font-size: 12px; font-weight: 500;">Sync</span>
            </div>
        `;
        
        // Apply Datadog's button classes
        button.className = 'druids_form_button druids_form_button--md druids_form_button--default';
        button.type = 'button';
        button.title = 'Sync timestamps to all Datadog tabs';
        button.setAttribute('aria-label', 'Sync Time');
        
        // Add custom styling to match the theme
        button.style.cssText = `
            background: #632ca6 !important;
            color: white !important;
            border: 1px solid #632ca6 !important;
            border-radius: 4px !important;
            margin-right: 16px !important;
            padding: 8px 12px !important;
            min-width: 60px !important;
            width: auto !important;
            overflow: visible !important;
            white-space: nowrap !important;
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
        `;
        
        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.background = '#7c3aed !important';
            button.style.borderColor = '#7c3aed !important';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#632ca6 !important';
            button.style.borderColor = '#632ca6 !important';
        });
        
        button.addEventListener('click', syncTimestampToAllTabs);
        
        // Find the control group with playback controls
        const controlGroup = timePicker.querySelector('.druids_time_playback-control__control-group');
        if (controlGroup) {
            // Insert before the first control button
            controlGroup.insertBefore(button, controlGroup.firstChild);
        } else {
            // Fallback: add to the main time picker container
            const flexContainer = timePicker.querySelector('.druids_layout_flex');
            if (flexContainer) {
                flexContainer.appendChild(button);
            } else {
                // Last resort: add to body as floating button
                document.body.appendChild(button);
                button.style.position = 'fixed';
                button.style.top = '20px';
                button.style.right = '20px';
                button.style.zIndex = '10000';
            }
        }
    }

    // Extract timestamp from current URL
    function getCurrentTimestamp() {
        const url = new URL(window.location.href);
        const from = url.searchParams.get('from_ts') || url.searchParams.get('from');
        const to = url.searchParams.get('to_ts') || url.searchParams.get('to');
        
        // Also check for live and refresh_mode parameters
        const live = url.searchParams.get('live') || 'false';
        const refresh_mode = url.searchParams.get('refresh_mode');
        

        
        return { from, to, live, refresh_mode };
    }

    // Apply timestamp to current tab
    function applyTimestamp(timestamp) {
        if (!timestamp.from && !timestamp.to && !timestamp.live && !timestamp.refresh_mode) {
            return;
        }

        const url = new URL(window.location.href);
        
        // Remove existing timestamp parameters
        url.searchParams.delete('from_ts');
        url.searchParams.delete('from');
        url.searchParams.delete('to_ts');
        url.searchParams.delete('to');
        url.searchParams.delete('live');
        url.searchParams.delete('refresh_mode');
        
        // Apply new timestamp parameters
        if (timestamp.from) {
            url.searchParams.set('from_ts', timestamp.from);
        }
        if (timestamp.to) {
            url.searchParams.set('to_ts', timestamp.to);
        }
        if (timestamp.live && timestamp.live !== 'false') {
            url.searchParams.set('live', timestamp.live);
        }
        if (timestamp.refresh_mode) {
            url.searchParams.set('refresh_mode', timestamp.refresh_mode);
        }
        
        // Navigate directly to the new URL with timestamps
        window.location.href = url.toString();
    }

    // Sync timestamp to all tabs
    function syncTimestampToAllTabs() {
        const timestamp = getCurrentTimestamp();
        
        if (!timestamp.from && !timestamp.to && !timestamp.live && !timestamp.refresh_mode) {
            alert('No timestamp found in current URL to sync');
            return;
        }
        
        // Store timestamp with a unique sync ID
        const syncData = {
            timestamp: timestamp,
            syncId: Date.now() + '_' + Math.random(),
            sourceTab: window.location.href
        };
        
        localStorage.setItem('dd-timestamp-sync', JSON.stringify(syncData));
        
        // Visual feedback
        const button = document.getElementById('dd-timestamp-sync-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Synced!';
        button.style.background = '#059669';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '#632ca6';
        }, 2000);
    }

    // Listen for storage changes (from other tabs)
    function listenForTimestampSync() {
        let lastSyncId = null;
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'dd-timestamp-sync' && e.newValue) {
                try {
                    const syncData = JSON.parse(e.newValue);
                    
                    // Avoid syncing from the same tab or duplicate syncs
                    if (syncData.sourceTab === window.location.href || 
                        syncData.syncId === lastSyncId) {
                        return;
                    }
                    
                    lastSyncId = syncData.syncId;
                    
                    // Show notification that sync is happening
                    showSyncNotification();
                    
                    // Apply the timestamp after a short delay
                    setTimeout(() => {
                        applyTimestamp(syncData.timestamp);
                    }, 500);
                    
                } catch (error) {
                    // Silently ignore malformed sync data
                }
            }
        });
    }

    // Show sync notification
    function showSyncNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = '🕐 Syncing timestamp...';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            background: #1f2937;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Initialize the script
    function init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Create the sync button
        createSyncButton();
        
        // Listen for sync events from other tabs
        listenForTimestampSync();

    }

    // Start the script
    init();
})(); 
