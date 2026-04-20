import type { ReactNode } from 'react';

type SectionHeaderProps = {
    title: string;
    icon?: ReactNode;
    className?: string;
    action?: ReactNode;
};

export default function SectionHeader({ title, icon, className = '', action }: SectionHeaderProps) {
    return (
        <div className={`mb-4 px-2 flex items-center justify-between gap-3 ${className}`.trim()}>
            <div className="flex items-center gap-2">
                {icon}
                <h2 className="text-xl font-bold">{title}</h2>
            </div>
            {action}
        </div>
    );
}
