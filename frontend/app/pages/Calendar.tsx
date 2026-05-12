"use client";

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@lib/supabase';

export default function CalendarPage() {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setEmail(session?.user?.email ?? null);
            setLoading(false);
        });
    }, []);

    const embedUrl = email
        ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`
        : null;

    return (
        <>
            <header className="mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                    <CalendarDays className="text-cyan-400 w-8 h-8" />
                    Calendar
                </h1>
                <p className="text-gray-400 text-sm mt-1">Your Google Calendar at a glance.</p>
            </header>

            {loading && (
                <p className="text-gray-400 text-sm">Loading calendar...</p>
            )}

            {!loading && !email && (
                <section className="bg-[#132e2a] rounded-3xl p-6 border border-[#1b3f3a] text-center">
                    <h2 className="text-lg font-bold text-white mb-2">Google Calendar not connected</h2>
                    <p className="text-sm text-gray-400">
                        Sign in with Google to see your calendar here.
                    </p>
                </section>
            )}

            {!loading && email && embedUrl && (
                <section className="bg-[#132e2a] rounded-3xl p-2 border border-[#1b3f3a] overflow-hidden">
                    <iframe
                        src={embedUrl}
                        className="w-full h-[600px] rounded-2xl"
                        style={{ border: 0 }}
                        title="Google Calendar"
                    />
                </section>
            )}
        </>
    );
}
