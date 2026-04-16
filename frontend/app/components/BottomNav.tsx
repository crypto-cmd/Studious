"use client";

import React from "react";
import { Home, ListTodo, Hourglass, BarChart2, Calendar } from "lucide-react";

export type TabId = "home" | "tasks" | "timer" | "analytics" | "calendar";

type BottomNavProps = {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
};

type NavItemProps = {
    icon: React.ReactElement<{ className?: string }>;
    id: TabId;
    isActive: boolean;
    onClick: () => void;
};

const NAV_ITEMS: Array<{ id: TabId; icon: React.ReactElement<{ className?: string }> }> = [
    { id: "tasks", icon: <ListTodo /> },
    { id: "timer", icon: <Hourglass /> },
    { id: "home", icon: <Home /> },
    { id: "analytics", icon: <BarChart2 /> },
    { id: "calendar", icon: <Calendar /> },
];

function NavItem({ icon, id, isActive, onClick }: NavItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={id}
            aria-pressed={isActive}
            className={`group relative h-12 w-12 shrink-0 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 transition-[transform,color] duration-500 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-95 ${isActive
                    ? "text-cyan-200"
                    : "text-gray-400 hover:text-white"
                }`}
        >
            <span
                className={`absolute inset-0 rounded-full transition-[opacity,transform,background-color,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] ${isActive
                        ? "opacity-100 scale-100 bg-cyan-400/15 shadow-[0_0_22px_rgba(34,211,238,0.28)]"
                        : "opacity-0 scale-75 bg-[#132e2a] group-hover:opacity-100 group-hover:scale-100"
                    }`}
            />
            {React.cloneElement(icon, {
                className: `relative z-10 w-6 h-6 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] ${isActive ? "scale-110 nav-icon-active" : "group-hover:scale-110"
                    }`,
            })}
        </button>
    );
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <div className="fixed bottom-6 left-0 right-0 mx-auto w-full max-w-md px-4 z-50">
            <nav className="bg-[#0e2421]/95 border border-[#1b3f3a] rounded-full p-2 flex justify-between items-center shadow-2xl backdrop-blur-md">
                {NAV_ITEMS.map((item) => (
                    <NavItem
                        key={item.id}
                        icon={item.icon}
                        id={item.id}
                        isActive={activeTab === item.id}
                        onClick={() => onTabChange(item.id)}
                    />
                ))}
            </nav>
        </div>
    );
}
