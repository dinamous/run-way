import React from 'react';

export const Badge: React.FC<any> = ({ children, variant = 'default', className = '' }) => {
  const variants:any = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    design: "bg-blue-100 text-blue-800",
    approval: "bg-yellow-100 text-yellow-800",
    dev: "bg-purple-100 text-purple-800",
    qa: "bg-green-100 text-green-800",
  };
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export default Badge;
