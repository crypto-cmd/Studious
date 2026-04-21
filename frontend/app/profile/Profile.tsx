"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import AppShell from "@components/AppShell";
import SignOutButton from "@components/SignOutButton";
import { supabase } from "@lib/supabase";
import { sessionStoreActions, useSessionStore } from "@lib/sessionStore";

type ProfilePayload = {
    name?: string;
    nickname?: string;
    study_hours_per_day?: number | string | null;
    calculated_study_hours_per_day?: number | string | null;
    use_calculated_study_hours?: boolean | null;
    sleep_hours_per_night?: number | string | null;
    exercise_hours_per_week?: number | string | null;
    mental_health_rating?: number | string | null;
};

const toInputValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    return String(value);
};

const toNumberOrNull = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
};

export default function ProfilePage() {
    const storedAuthId = useSessionStore((snapshot) => snapshot.authId);
    const [authId, setAuthId] = useState<string | null>(storedAuthId);
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [studyHoursPerDay, setStudyHoursPerDay] = useState("");
    const [calculatedStudyHoursPerDay, setCalculatedStudyHoursPerDay] = useState("");
    const [useCalculatedStudyHours, setUseCalculatedStudyHours] = useState(false);
    const [sleepHoursPerNight, setSleepHoursPerNight] = useState("");
    const [exerciseHoursPerWeek, setExerciseHoursPerWeek] = useState("");
    const [mentalHealthRating, setMentalHealthRating] = useState("");
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

                setName((payload.name ?? "").trim());
                setNickname((payload.nickname ?? "").trim());
                setStudyHoursPerDay(toInputValue(payload.study_hours_per_day));
                setCalculatedStudyHoursPerDay(toInputValue(payload.calculated_study_hours_per_day));
                setUseCalculatedStudyHours(Boolean(payload.use_calculated_study_hours));
                setSleepHoursPerNight(toInputValue(payload.sleep_hours_per_night));
                setExerciseHoursPerWeek(toInputValue(payload.exercise_hours_per_week));
                setMentalHealthRating(toInputValue(payload.mental_health_rating));
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

        const nextName = name.trim();
        const nextNickname = nickname.trim();
        const nextStudyHoursPerDay = toNumberOrNull(studyHoursPerDay);
        const nextCalculatedStudyHoursPerDay = toNumberOrNull(calculatedStudyHoursPerDay);
        const nextSleepHoursPerNight = toNumberOrNull(sleepHoursPerNight);
        const nextExerciseHoursPerWeek = toNumberOrNull(exerciseHoursPerWeek);
        const nextMentalHealthRating = toNumberOrNull(mentalHealthRating);

        if (!nextName) {
            setErrorMessage("Name is required.");
            return;
        }

        if (
            nextStudyHoursPerDay === null ||
            nextSleepHoursPerNight === null ||
            nextExerciseHoursPerWeek === null ||
            nextMentalHealthRating === null
        ) {
            setErrorMessage("Please complete the study data fields.");
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
                    name: nextName,
                    nickname: nextNickname || null,
                    study_hours_per_day: nextStudyHoursPerDay,
                    use_calculated_study_hours: useCalculatedStudyHours,
                    sleep_hours_per_night: nextSleepHoursPerNight,
                    exercise_hours_per_week: nextExerciseHoursPerWeek,
                    mental_health_rating: nextMentalHealthRating,
                }),
            });

            const payload = (await response.json()) as ProfilePayload & { error?: string };
            if (!response.ok) {
                throw new Error(payload?.error ?? "Unable to update profile");
            }

            setName((payload.name ?? nextName).trim());
            setNickname((payload.nickname ?? nextNickname).trim());
            setStudyHoursPerDay(toInputValue(payload.study_hours_per_day ?? nextStudyHoursPerDay));
            setCalculatedStudyHoursPerDay(toInputValue(payload.calculated_study_hours_per_day ?? nextCalculatedStudyHoursPerDay));
            setUseCalculatedStudyHours(Boolean(payload.use_calculated_study_hours ?? useCalculatedStudyHours));
            setSleepHoursPerNight(toInputValue(payload.sleep_hours_per_night ?? nextSleepHoursPerNight));
            setExerciseHoursPerWeek(toInputValue(payload.exercise_hours_per_week ?? nextExerciseHoursPerWeek));
            setMentalHealthRating(toInputValue(payload.mental_health_rating ?? nextMentalHealthRating));
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
                    <p className="text-gray-400 text-sm mt-1">Update your name and student study data.</p>
                </div>
            </header>

            <section className="bg-[#132e2a] rounded-3xl p-5 border border-[#1b3f3a] shadow-lg">
                {isLoading ? (
                    <p className="text-sm text-gray-300">Loading profile...</p>
                ) : (
                    <form onSubmit={handleSave} className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Name</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Nickname</span>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(event) => setNickname(event.target.value)}
                                placeholder="Optional"
                                className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                            />
                        </label>

                        <div className="rounded-2xl border border-[#1b3f3a] bg-[#0a1816] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Study hours source</p>
                                    <p className="text-xs text-gray-400">Choose whether predictions use your manual value or the calculated one.</p>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={useCalculatedStudyHours}
                                        onChange={(event) => setUseCalculatedStudyHours(event.target.checked)}
                                        className="h-4 w-4 rounded border-[#1b3f3a] bg-[#132e2a] text-cyan-400 focus:ring-cyan-400"
                                    />
                                    Use calculated
                                </label>
                            </div>
                        </div>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Study hours per day</span>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={studyHoursPerDay}
                                onChange={(event) => setStudyHoursPerDay(event.target.value)}
                                className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Calculated study hours per day</span>
                            <input
                                type="number"
                                value={calculatedStudyHoursPerDay}
                                readOnly
                                className="w-full bg-[#091310] text-gray-300 rounded-xl p-3 border border-[#1b3f3a] focus:outline-none"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Sleep hours per night</span>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={sleepHoursPerNight}
                                onChange={(event) => setSleepHoursPerNight(event.target.value)}
                                className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Exercise hours per week</span>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={exerciseHoursPerWeek}
                                onChange={(event) => setExerciseHoursPerWeek(event.target.value)}
                                className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-300">Mental health rating</span>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                step="1"
                                value={mentalHealthRating}
                                onChange={(event) => setMentalHealthRating(event.target.value)}
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
