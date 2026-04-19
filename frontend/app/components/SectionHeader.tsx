import type { ReactNode } from 'react';

type SectionHeaderProps = {
    title: string;
    icon?: ReactNode;
    className?: string;
};

export default function SectionHeader({ title, icon, className = '' }: SectionHeaderProps) {
    return (
        <div className={`mb-4 px-2 flex items-center gap-2 ${className}`.trim()}>
            {icon}
            <h2 className="text-xl font-bold">{title}</h2>
        </div>
    );
}
