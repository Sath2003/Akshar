import { forwardRef } from 'react';

export const Input = forwardRef(({ label, id, error, className = '', ...props }, ref) => {
  return (
    <div className={`premium-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className="premium-label">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`premium-input ${error ? 'border-red-500 focus:border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 animate-fade-in">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
