import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  languages: Language[];
  onLanguageChange: (code: string) => void;
}

const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  isOpen,
  onClose,
  buttonRef,
  languages,
  onLanguageChange
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192 // 192px = w-48
      });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      updateDropdownPosition();
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-48 bg-white rounded-xl shadow-lg border border-secondary-200/50 py-2 z-[9998]"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`
      }}
    >
      {languages.map((language) => (
        <button
          key={language.code}
          onClick={() => onLanguageChange(language.code)}
          className="w-full text-left px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 flex items-center gap-3 transition-colors duration-200"
        >
          <span className="text-lg leading-none">{language.flag}</span>
          <span className="font-medium">{language.name}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};

export default LanguageDropdown;
