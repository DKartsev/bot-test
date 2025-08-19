'use client';

interface CategoryBadgeProps {
  name: string;
  color?: string;
}

export default function CategoryBadge({ name, color = '#4f46e5' }: CategoryBadgeProps) {
  return (
    <span
      className="px-2 py-1 rounded-full text-white text-xs font-medium"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
