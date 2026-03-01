import { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          {trend && (
            <p className={`mt-2 text-sm ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
