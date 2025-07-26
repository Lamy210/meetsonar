import { forwardRef } from "preact/compat";
import type { JSX } from "preact";

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> { }

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className = "", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`rounded-lg border border-slate-700 bg-slate-800 text-white shadow-sm ${className}`}
                {...props}
            />
        );
    }
) as any;

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(
    ({ className = "", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`flex flex-col space-y-1.5 p-6 ${className}`}
                {...props}
            />
        );
    }
) as any;

export const CardTitle = forwardRef<HTMLHeadingElement, JSX.HTMLAttributes<HTMLHeadingElement>>(
    ({ className = "", ...props }, ref) => {
        return (
            <h3
                ref={ref}
                className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
                {...props}
            />
        );
    }
) as any;

export const CardContent = forwardRef<HTMLDivElement, CardProps>(
    ({ className = "", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`p-6 pt-0 ${className}`}
                {...props}
            />
        );
    }
) as any;

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardContent.displayName = "CardContent";
