import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
    type: AlertType;
    message: string;
    className?: string;
}

const alertStyles: Record<AlertType, string> = {
    success: 'bg-success-50 text-success-700 border-success-500',
    error: 'bg-danger-50 text-danger-700 border-danger-500',
    warning: 'bg-warning-50 text-warning-700 border-warning-500',
    info: 'bg-primary-50 text-primary-700 border-primary-500',
};

export const Alert: React.FC<AlertProps> = ({ type, message, className }) => {
    return (
        <div
            className={cn(
                'border-l-4 p-4 rounded',
                alertStyles[type],
                className
            )}
            role="alert"
        >
            <p className="text-sm">{message}</p>
        </div>
    );
};
