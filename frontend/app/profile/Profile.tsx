"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import AppShell from "@components/AppShell";
import SignOutButton from "@components/SignOutButton";
import { supabase } from "@lib/supabase";
import { sessionStoreActions, useSessionStore } from "@lib/sessionStore";

type ProfilePayload = {
    firstname?: string;
    lastname?: string;
    nickname?: string;
    name?: string;
};

function buildDisplayName(firstname: string, lastname: string, nickname: string) {
    return nickname.trim() || [firstname.trim(), lastname.trim()].filter(Boolean).join(" ");
}

export default function ProfilePage() {
    const storedAuthId = useSessionStore((snapshot) => snapshot.authId);
    const [authId, setAuthId] = useState<string | null>(storedAuthId);
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [nickname, setNickname] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        if (storedAuthId) {
            setAuthId(storedAuthId);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isCancelled) {
                return;
            }

            const nextAuthId = session?.user?.id ?? null;
            setAuthId(nextAuthId);
            sessionStoreActions.setAuthId(nextAuthId);
        });

        return () => {
            isCancelled = true;
        };
    }, [storedAuthId]);

    useEffect(() => {
        if (!authId) {
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        setIsLoading(true);
        setErrorMessage(null);

        fetch(`/api/student-profile?auth_id=${encodeURIComponent(authId)}`, {
            cache: "no-store",
        })
            .then(async (response) => {
                const payload = (await response.json()) as ProfilePayload & { error?: string };

                if (!response.ok) {
                    throw new Error(payload?.error ?? "Unable to load profile");
                }

                if (isCancelled) {
                    return;
                }

                setFirstname((payload.firstname ?? "").trim());
                setLastname((payload.lastname ?? "").trim());
                setNickname((payload.nickname ?? "").trim());
            })
            .catch((error: unknown) => {
                if (!isCancelled) {
                    setErrorMessage(error instanceof Error ? error.message : "Unable to load profile");
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [authId]);

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!authId) {
            setErrorMessage("You must be signed in to edit your profile.");
            return;
        }

        const nextFirstname = firstname.trim();
        const nextLastname = lastname.trim();
        const nextNickname = nickname.trim();

        if (!nextFirstname || !nextLastname || !nextNickname) {
            setErrorMessage("First name, last name, and nickname are required.");
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/student-profile?auth_id=${encodeURIComponent(authId)}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstname: nextFirstname,
                    lastname: nextLastname,
                    nickname: nextNickname,
                    name: buildDisplayName(nextFirstname, nextLastname, nextNickname),
                }),
            });

            const payload = (await response.json()) as ProfilePayload & { error?: string };
            if (!response.ok) {
                throw new Error(payload?.error ?? "Unable to update profile");
            }

            setFirstname((payload.firstname ?? nextFirstname).trim());
            setLastname((payload.lastname ?? nextLastname).trim());
            setNickname((payload.nickname ?? nextNickname).trim());
            setSuccessMessage("Profile updated.");
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (!authId) {
        return (
            <AppShell>
                <section className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
                    <h1 className="text-3xl font-bold text-white">Profile</h1>
                    <p className="text-gray-300 text-sm max-w-xs">Sign in to access and edit your profile.</p>
                    <Link
                        href="/"
                        className="bg-cyan-500 text-[#091f1c] font-bold py-3 px-6 rounded-xl hover:bg-cyan-400 transition-colors"
                    >
                        Back to Dashboard
                    </Link>
                </section>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <header className="mb-6 flex items-center gap-2">
                <UserRound className="text-cyan-400 w-8 h-8" />
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Profile</h1>
                    <p className="text-gray-400 text-sm mt-1">Update how your name appears in Studious.</p>
                </div>
            </header>

            <section className="bg-[#132e2a] rounded-3xl p-5 border border-[#1b3f3a] shadow-lg">
                {isLoading ? (
                    <p className="text-sm text-gray-300">Loading profile...</p>
                ) : (
                    <form onSubmit={handleSave} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-300">First name</span>
                                <input
                                    type="text"
                                    value={firstname}
                                    onChange={(event) => setFirstname(event.target.value)}
                                    className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-300">Last name</span>
                                <input
                                    type="text"
                                    value={lastname}
                                    onChange={(event) => setLastname(event.target.value)}
                                    className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                                />
                            </label>
                        </div>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Nickname</span>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(event) => setNickname(event.target.value)}
                                className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                            />
                        </label>

                        {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
                        {successMessage && <p className="text-sm text-cyan-300">{successMessage}</p>}

                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-cyan-500 text-[#091f1c] font-bold py-2.5 px-5 rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-60"
                            >
                                {isSaving ? "Saving..." : "Save changes"}
                            </button>
                            <Link
                                href="/"
                                className="text-sm text-gray-300 hover:text-white transition-colors"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </form>
                )}
            </section>

            <div className="mt-5">
                <SignOutButton />
            </div>
        </AppShell>
    );
}
