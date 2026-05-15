interface StatCardProps {
  value: string
  label: string
  color?: string
}

export function StatCard({ value, label, color = 'text-mauve' }: StatCardProps) {
  return (
    <div className="bg-surface0/50 rounded-lg p-4 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-subtext0">{label}</span>
    </div>
  )
}
