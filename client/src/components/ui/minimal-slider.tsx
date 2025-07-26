import { InputHTMLAttributes } from 'preact/compat';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'min' | 'max' | 'value' | 'onChange'> {
    value: number[];
    onValueChange: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
}

export function Slider({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    className = "",
    ...props
}: SliderProps) {
    const currentValue = value[0] || 0;

    return (
        <div className={`relative ${className}`}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={(e) => onValueChange([parseInt(e.currentTarget.value)])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentValue / max) * 100}%, #d1d5db ${(currentValue / max) * 100}%, #d1d5db 100%)`
                }}
                {...props}
            />
            <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
        </div>
    );
}
