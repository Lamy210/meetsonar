import { useState, useRef, useEffect } from 'preact/hooks';

interface SelectProps {
    options: Array<{ value: string, label: string }>;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = "選択してください...",
    className = "",
    disabled = false
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // 外部クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // ESCキーで閉じる
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen]);

    const selectedOption = options.find(option => option.value === value);

    return (
        <div ref={selectRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          dark:bg-gray-800 dark:border-gray-600 dark:text-white
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
            >
                <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-600">
                    <ul className="max-h-60 overflow-auto py-1">
                        {options.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700
                    ${value === option.value ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
                  `}
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// 軽量なSelectItem（互換性のため）
export function SelectItem({ children, value }: { children: React.ReactNode; value: string }) {
    return <option value={value}>{children}</option>;
}

// 軽量なSelectContent（互換性のため）
export function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

// 軽量なSelectTrigger（互換性のため）
export function SelectTrigger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}

// 軽量なSelectValue（互換性のため）
export function SelectValue({ placeholder }: { placeholder?: string }) {
    return <span>{placeholder}</span>;
}
