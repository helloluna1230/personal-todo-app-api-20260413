import { Router, Request, Response } from 'express';
import { NotificationPermissionService } from '../services/notificationPermissionService';
import { NotificationPermissionStatus } from '../models/notificationPermission';

const VALID_STATUSES: NotificationPermissionStatus[] = ['granted', 'denied', 'undetermined'];

export function createNotificationsRouter(
  permissionService: NotificationPermissionService,
): Router {
  const router = Router();

  // GET /notifications/permission – query the current permission status
  router.get('/permission', (_req: Request, res: Response) => {
    res.json(permissionService.getPermission());
  });

  // POST /notifications/permission – update the permission status reported by the client
  router.post('/permission', (req: Request, res: Response) => {
    const { status } = req.body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as NotificationPermissionStatus)) {
      res.status(400).json({
        error: 'INVALID_STATUS',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
      return;
    }

    const permission = permissionService.updatePermission(
      status as NotificationPermissionStatus,
    );
    res.status(200).json(permission);
  });

  return router;
}
