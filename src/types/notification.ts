import { Role } from "../types/auth";

export interface NotificationItem {
  id: string;
  recipientId: string;
  recipientRole: Role;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}
