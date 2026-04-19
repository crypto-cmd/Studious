"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { supabase } from "@lib/supabase";
import { sessionStoreActions } from "@lib/sessionStore";

type ProfileButtonProps = {
    studentName: string | null;
};

function getInitials(studentName: string | null) {
    const trimmed = studentName?.trim() ?? "";

    if (!trimmed) {
        return "P";
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function ProfileButton({ studentName }: ProfileButtonProps) {
    const initials = getInitials(studentName);
    const [isOpen, setIsOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleOutsidePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsidePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsidePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const handleSignOut = async () => {
        if (isSigningOut) {
            return;
        }

        setIsSigningOut(true);

        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error signing out:", error.message);
            setIsSigningOut(false);
            return;
        }

        sessionStoreActions.clear();
        window.location.assign("/?intent=signin");
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Open profile menu"
                onClick={() => setIsOpen((currentOpen) => !currentOpen)}
                className="h-10 w-10 rounded-full border border-[#1b3f3a] bg-[#132e2a] text-cyan-300 hover:text-white hover:border-cyan-400/70 transition-colors flex items-center justify-center text-sm font-bold"
            >
                {initials}
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#1b3f3a] bg-[#0f2522] p-2 shadow-2xl z-50"
                >
                    <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="w-full rounded-xl px-3 py-2 text-sm text-gray-100 hover:bg-[#173732] transition-colors inline-flex items-center gap-2"
                    >
                        <UserRound className="h-4 w-4" />
                        Manage profile
                    </Link>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-red-200 hover:bg-red-500/10 transition-colors inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <LogOut className="h-4 w-4" />
                        {isSigningOut ? "Signing out..." : "Sign out"}
                    </button>
                </div>
            )}
        </div>
    );
}
