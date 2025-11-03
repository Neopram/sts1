/**
 * CREATE OPERATION BUTTON
 * 
 * Botón inteligente que:
 * - Solo se muestra si el usuario tiene permiso
 * - Redirige a /create-operation
 * - Se puede usar en cualquier parte de la UI
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleGuard } from '../RoleGuard';

interface CreateOperationButtonProps {
  className?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  showIcon?: boolean;
}

export const CreateOperationButton: React.FC<CreateOperationButtonProps> = ({
  className = '',
  label = 'Create New Operation',
  variant = 'primary',
  showIcon = true
}) => {
  const navigate = useNavigate();
  
  const baseClass = 'btn create-operation-btn';
  const variantClass = `btn-${variant}`;
  const fullClass = `${baseClass} ${variantClass} ${className}`.trim();
  
  const handleClick = () => {
    navigate('/create-operation');
  };
  
  return (
    <RoleGuard can="create_operation">
      <button
        onClick={handleClick}
        className={fullClass}
        title="Create a new STS operation or session"
      >
        {showIcon && <span className="icon">+</span>}
        {label}
      </button>
    </RoleGuard>
  );
};

export default CreateOperationButton;