import { NotificationPermissionRepository } from '../repositories/notificationPermissionRepository';
import {
  NotificationPermission,
  NotificationPermissionStatus,
} from '../models/notificationPermission';

export class NotificationPermissionService {
  constructor(private readonly repo: NotificationPermissionRepository) {}

  /**
   * Returns the current notification permission status.
   */
  getPermission(): NotificationPermission {
    return this.repo.get();
  }

  /**
   * Updates the permission status reported by the client (e.g. after the OS
   * permission dialog is dismissed).
   */
  updatePermission(status: NotificationPermissionStatus): NotificationPermission {
    return this.repo.set(status);
  }

  /**
   * Returns true when the client has been granted notification permission.
   */
  isGranted(): boolean {
    return this.repo.get().status === 'granted';
  }
}
