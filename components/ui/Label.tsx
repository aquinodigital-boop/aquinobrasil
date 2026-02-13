import React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label: React.FC<LabelProps> = ({ className, ...props }) => {
  return (
    <label
      className={`block text-sm font-medium text-slate-300 ${className}`}
      {...props}
    />
  );
};
