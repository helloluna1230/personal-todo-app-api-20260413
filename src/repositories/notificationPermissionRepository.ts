import {
  NotificationPermission,
  NotificationPermissionStatus,
} from '../models/notificationPermission';

/**
 * Stores the notification permission status reported by the client.
 * In a production system this would be persisted per-user.
 */
export class NotificationPermissionRepository {
  private permission: NotificationPermission = {
    status: 'undetermined',
    updatedAt: new Date(),
  };

  get(): NotificationPermission {
    return this.permission;
  }

  set(status: NotificationPermissionStatus): NotificationPermission {
    this.permission = { status, updatedAt: new Date() };
    return this.permission;
  }

  /** For testing: reset to initial state. */
  reset(): void {
    this.permission = { status: 'undetermined', updatedAt: new Date() };
  }
}
