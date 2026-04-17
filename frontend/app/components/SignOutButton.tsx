"use client";

import { LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function SignOutButton() {
    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error signing out:", error.message);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1b3f3a] bg-[#132e2a] px-3 py-2 text-sm font-semibold text-gray-100 hover:bg-[#173732] transition-colors"
        >
            <LogOut className="h-4 w-4" />
            Sign out
        </button>
    );
}
