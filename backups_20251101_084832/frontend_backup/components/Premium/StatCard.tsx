/**
 * Premium Stat Card - Metrics display with animations
 * Uso: Mostrar KPIs y métricas
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    accent: 'bg-blue-100',
  },
  green: {
    bg: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    accent: 'bg-green-100',
  },
  red: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    accent: 'bg-red-100',
  },
  yellow: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    accent: 'bg-yellow-100',
  },
  purple: {
    bg: 'bg-purple-50 border-purple-200',
    icon: 'text-purple-600',
    accent: 'bg-purple-100',
  },
};

const sizeMap = {
  sm: 'px-4 py-3 text-base',
  md: 'px-6 py-4 text-lg',
  lg: 'px-8 py-6 text-2xl',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  color = 'blue',
  size = 'md'
}) => {
  const { bg, icon: iconColor, accent } = colorMap[color];

  return (
    <div className={`rounded-2xl border ${bg} backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 ${sizeMap[size]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-gray-900">{value}</span>
            {unit && <span className="text-gray-500 text-sm">{unit}</span>}
          </div>
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${accent} rounded-xl p-3 flex-shrink-0`}>
            <div className={`${iconColor}`}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
};