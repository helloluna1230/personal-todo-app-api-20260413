/**
 * Represents the device/user notification permission status.
 * In a real mobile-backend scenario, this is managed on the client side;
 * the API stores the granted status per user so it can gate reminder creation.
 */
export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface NotificationPermission {
  status: NotificationPermissionStatus;
  updatedAt: Date;
}
