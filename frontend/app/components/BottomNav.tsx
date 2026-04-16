"use client";

import React from "react";
import { Home, ListTodo, Hourglass, BarChart2, Calendar } from "lucide-react";

export type TabId = "home" | "tasks" | "timer" | "analytics" | "calendar";

type BottomNavProps = {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
};

type NavItemProps = {
    icon: React.ReactElement;
    id: TabId;
    activeTab: TabId;
    onClick: () => void;
};

function NavItem({ icon, id, activeTab, onClick }: NavItemProps) {
    const isActive = activeTab === id;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={id}
            aria-pressed={isActive}
            className={`p-3 rounded-full transition-all duration-300 ${isActive
                    ? "text-cyan-400 bg-[#1b3f3a]"
                    : "text-gray-400 hover:text-white hover:bg-[#132e2a]"
                }`}
        >
            {React.cloneElement(icon, { className: "w-6 h-6" })}
        </button>
    );
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <div className="fixed bottom-6 left-0 right-0 mx-auto w-full max-w-md px-4 z-50">
            <nav className="bg-[#0e2421] border border-[#1b3f3a] rounded-full p-2 flex justify-between items-center shadow-2xl backdrop-blur-md">
                <NavItem
                    icon={<ListTodo />}
                    id="tasks"
                    activeTab={activeTab}
                    onClick={() => onTabChange("tasks")}
                />
                <NavItem
                    icon={<Hourglass />}
                    id="timer"
                    activeTab={activeTab}
                    onClick={() => onTabChange("timer")}
                />

                <NavItem
                    icon={<Home />}
                    id="home"
                    activeTab={activeTab}
                    onClick={() => onTabChange("home")}
                />

                <NavItem
                    icon={<BarChart2 />}
                    id="analytics"
                    activeTab={activeTab}
                    onClick={() => onTabChange("analytics")}
                />
                <NavItem
                    icon={<Calendar />}
                    id="calendar"
                    activeTab={activeTab}
                    onClick={() => onTabChange("calendar")}
                />
            </nav>
        </div>
    );
}
