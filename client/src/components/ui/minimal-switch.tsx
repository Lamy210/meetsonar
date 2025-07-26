import { InputHTMLAttributes } from 'preact/compat';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
}

export function Switch({
    checked,
    onCheckedChange,
    className = "",
    disabled = false,
    ...props
}: SwitchProps) {
    return (
        <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onCheckedChange(e.currentTarget.checked)}
                disabled={disabled}
                className="sr-only"
                {...props}
            />
            <div className={`
        relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out
        ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? '' : 'hover:shadow-md'}
      `}>
                <div className={`
          absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white'}
        `} />
            </div>
        </label>
    );
}
