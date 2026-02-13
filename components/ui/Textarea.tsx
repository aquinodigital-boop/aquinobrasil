import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={`w-full bg-gray-800/50 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 p-3 min-h-[100px] resize-y ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';