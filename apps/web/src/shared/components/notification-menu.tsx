import Link from "next/link";
import type { NotificationResponse } from "@/features/notifications/types";

type NotificationMenuProps = {
  notifications: NotificationResponse[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
};

function timeAgo(dateString: string) {
  const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function EmptyNotifications() {
  return <div className="px-4 py-8 text-center"><p className="text-xs text-[var(--color-text-secondary)] font-medium">No notifications yet</p></div>;
}

export function DesktopNotificationMenu({ notifications, onClose, onMarkAllRead, onMarkRead, onDelete }: NotificationMenuProps) {
  return (
    <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30 flex items-center justify-between">
        <h4 className="m-0 font-serif font-black text-sm text-[var(--color-text-primary)]">Notifications</h4>
        {notifications.length > 0 && <button onClick={onMarkAllRead} className="text-[9px] font-bold uppercase text-[var(--color-accent)] hover:underline active:scale-[0.98] transition-all">Mark all read</button>}
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]/30">
        {notifications.length === 0 ? <EmptyNotifications /> : notifications.slice(0, 50).map((notification) => (
          <div key={notification.id} className={`group px-4 py-3 transition-colors flex items-start justify-between gap-2 ${!notification.read ? "bg-[var(--color-accent)]/5" : "hover:bg-[var(--color-background-body)]/20"}`}>
            <Link
              href={notification.linkUrl || "#"}
              onClick={() => {
                onClose();
                if (!notification.read) onMarkRead(notification.id);
              }}
              className="flex-1 min-w-0"
            >
              <p className="text-[11px] text-[var(--color-text-primary)] font-medium leading-snug m-0 group-hover:text-[var(--color-accent)] transition-colors">{notification.message}</p>
              <span className="text-[9px] text-[var(--color-text-secondary)] mt-1 block">{timeAgo(notification.createdAt)}</span>
            </Link>
            <button
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                onDelete(notification.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[9px] text-red-500 hover:text-red-700 transition-all font-bold uppercase cursor-pointer"
              title="Delete notification"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MobileNotificationMenu({ notifications, onClose }: Pick<NotificationMenuProps, "notifications" | "onClose">) {
  return (
    <div className="md:hidden absolute right-4 top-16 w-[calc(100%-2rem)] max-w-sm bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30 flex items-center justify-between">
        <h4 className="m-0 font-serif font-black text-sm text-[var(--color-text-primary)]">Notifications</h4>
        <button onClick={onClose} className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:bg-black/5 transition-colors active:scale-95 duration-150" title="Close notifications">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-border)]/30">
        {notifications.length === 0 ? <EmptyNotifications /> : notifications.slice(0, 10).map((notification) => (
          <div key={notification.id} className={`px-4 py-3 transition-colors ${!notification.read ? "bg-[var(--color-accent)]/5" : "hover:bg-[var(--color-background-body)]/20"}`}>
            <p className="text-[11px] text-[var(--color-text-primary)] font-medium leading-snug m-0">{notification.message}</p>
            <span className="text-[9px] text-[var(--color-text-secondary)] mt-1 block">{timeAgo(notification.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
