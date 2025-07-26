import { forwardRef } from "preact/compat";
import { ComponentChildren } from "preact";
import type { Ref } from "preact";

interface ScrollAreaProps {
    className?: string;
    children: ComponentChildren;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
    ({ className = "", children }, ref) => {
        return (
            <div
                ref={ref}
                className={`relative overflow-auto ${className}`}
                style={{ scrollbarWidth: 'thin' }}
            >
                <div className="h-full w-full">
                    {children}
                </div>
            </div>
        );
    }
);

ScrollArea.displayName = "ScrollArea";
