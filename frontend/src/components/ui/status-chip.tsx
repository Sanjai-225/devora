import type { ProjectStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';

interface StatusChipProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusChip({ status, className = '' }: StatusChipProps) {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        h-5 px-2 rounded-[4px]
        font-mono text-[11px] font-medium leading-[14px] tracking-[0.02em]
        border
        ${colors.text} ${colors.bg} ${colors.border}
        ${className}
      `}
    >
      <span className={`w-[5px] h-[5px] rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}

