import React from 'react';
import { Database } from 'lucide-react';

interface EmptyProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * Empty State Component
 */
export const Empty: React.FC<EmptyProps> = ({
  title = 'No hay datos',
  message = 'No hay nada que mostrar por ahora',
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-300 mb-4">
        {icon || <Database size={48} />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default Empty;