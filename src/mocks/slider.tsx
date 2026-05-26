import React from 'react';

interface SliderProps {
  value?: number;
  onValueChange?: (val: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  style?: any;
  [key: string]: any;
}

export default function Slider({
  value = 0,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  disabled = false,
  style,
}: SliderProps) {
  return (
    <div style={{ width: '100%', padding: '6px 0', ...style }}>
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (onValueChange) {
            onValueChange(parseFloat(e.target.value));
          }
        }}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: '#1a1a2e',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          accentColor: '#00ffff', // cyberpunk cyan hue
        }}
      />
    </div>
  );
}
