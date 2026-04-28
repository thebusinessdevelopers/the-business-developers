interface NotificationBadgeProps {
  count: number
  className?: string
}

export default function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
