import type { JSX, ComponentChildren } from 'preact';

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    children?: ComponentChildren;
    disabled?: boolean;
}

export function Button({
    variant = 'default',
    size = 'default',
    className = '',
    children,
    ...props
}: ButtonProps) {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';

    const variants = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
        destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
        link: 'underline-offset-4 hover:underline text-blue-600 dark:text-blue-400'
    };

    const sizes = {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10'
    };

    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
}
