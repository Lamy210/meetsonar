import type { JSX, ComponentChildren } from 'preact';

interface LabelProps extends JSX.HTMLAttributes<HTMLLabelElement> {
    children?: ComponentChildren;
    className?: string;
}

export function Label({ children, className = "", ...props }: LabelProps) {
    return (
        <label
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
            {...props}
        >
            {children}
        </label>
    );
}
