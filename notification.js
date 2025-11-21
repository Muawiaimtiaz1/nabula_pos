// Notification System Module

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', or 'info'
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showNotification(message, type = 'info', duration = 4000) {
    // Ensure container exists
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Get icon based on type
    const iconMap = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    const icon = iconMap[type] || 'info';

    // Build notification HTML
    notification.innerHTML = `
        <div class="notification-icon">
            <span class="material-icons">${icon}</span>
        </div>
        <div class="notification-content">
            <div class="notification-message">${escapeHtml(message)}</div>
        </div>
        <button class="notification-close" aria-label="Close notification">
            <span class="material-icons">close</span>
        </button>
    `;

    // Add to container
    container.appendChild(notification);

    // Set up close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }

    return notification;
}

/**
 * Removes a notification with animation
 * @param {HTMLElement} notification - The notification element to remove
 */
function removeNotification(notification) {
    if (!notification || notification.classList.contains('removing')) {
        return;
    }

    notification.classList.add('removing');

    // Remove from DOM after animation completes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300); // Match animation duration
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Optional: Clear all notifications
export function clearAllNotifications() {
    const container = document.getElementById('notification-container');
    if (container) {
        const notifications = container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            removeNotification(notification);
        });
    }
}
