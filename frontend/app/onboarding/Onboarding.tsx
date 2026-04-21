"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import AppShell from "@components/AppShell";
import Loading from "@components/Loading";
import { supabase } from "@lib/supabase";
import { sessionStoreActions, useSessionStore } from "@lib/sessionStore";

type OnboardingStep = 1 | 2;

type FormState = {
    name: string;
    nickname: string;
    studentId: string;
    gender: string;
    age: string;
    mentalHealthRating: string;
    exerciseFrequency: string;
    sleepHours: string;
    studyHoursPerDay: string;
};

const EMPTY_FORM: FormState = {
    name: "",
    nickname: "",
    studentId: "",
    gender: "",
    age: "",
    mentalHealthRating: "",
    exerciseFrequency: "",
    sleepHours: "",
    studyHoursPerDay: "",
};

function buildSignupDefaults(sessionUser: { user_metadata?: Record<string, unknown>; email?: string | null }) {
    const seededName =
        (sessionUser.user_metadata?.nickname as string | undefined) ||
        (sessionUser.user_metadata?.name as string | undefined) ||
        (sessionUser.user_metadata?.full_name as string | undefined) ||
        sessionUser.email?.split("@")[0] ||
        "";

    return {
        name: seededName.trim(),
        nickname: seededName.trim(),
    };
}

export default function OnboardingPage() {
    const storedAuthId = useSessionStore((snapshot) => snapshot.authId);
    const [authId, setAuthId] = useState<string | null>(storedAuthId);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [step, setStep] = useState<OnboardingStep>(1);
    const [isCheckingProfile, setIsCheckingProfile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleBackToSignIn = () => {
        window.sessionStorage.setItem("auth_intent", "signin");
    };

    useEffect(() => {
        let isCancelled = false;

        if (storedAuthId) {
            setAuthId(storedAuthId);
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isCancelled) {
                return;
            }

            const nextAuthId = session?.user?.id ?? null;
            setAuthId(nextAuthId);
            sessionStoreActions.setAuthId(nextAuthId);

            if (session?.user) {
                const defaults = buildSignupDefaults(session.user);
                setForm((current) => ({ ...current, ...defaults }));
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [storedAuthId]);

    useEffect(() => {
        if (!authId) {
            setIsCheckingProfile(false);
            return;
        }

        let isCancelled = false;

        fetch(`/api/student-profile?auth_id=${encodeURIComponent(authId)}`, {
            cache: "no-store",
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));

                if (isCancelled) {
                    return;
                }

                if (response.ok) {
                    window.location.replace("/");
                    return;
                }

                if (response.status !== 404) {
                    throw new Error(payload?.error ?? "Unable to start onboarding");
                }
            })
            .catch((error: unknown) => {
                if (!isCancelled) {
                    setErrorMessage(error instanceof Error ? error.message : "Unable to start onboarding");
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsCheckingProfile(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [authId]);

    const toNumberOrNull = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const numeric = Number(trimmed);
        return Number.isFinite(numeric) ? numeric : null;
    };

    const isStep1Valid = [form.name, form.studentId, form.gender].every((value) => value.trim()) && toNumberOrNull(form.age) != null;
    const isStep2Valid = [form.mentalHealthRating, form.exerciseFrequency, form.sleepHours, form.studyHoursPerDay].every(
        (value) => toNumberOrNull(value) != null
    );

    const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
    };

    const handleContinue = () => {
        if (!isStep1Valid) {
            setErrorMessage("Complete your profile basics before continuing.");
            return;
        }

        setErrorMessage(null);
        setStep(2);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!authId) {
            setErrorMessage("You need to be signed in before onboarding.");
            return;
        }

        if (!isStep1Valid) {
            setErrorMessage("Complete your profile basics before continuing.");
            return;
        }

        if (!isStep2Valid) {
            setErrorMessage("Complete your student habits before continuing.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/student-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    auth_id: authId,
                    name: form.name.trim(),
                    nickname: form.nickname.trim() || null,
                    student_id: form.studentId.trim(),
                    gender: form.gender.trim(),
                    age: toNumberOrNull(form.age),
                    onboarding: {
                        mental_health_rating: toNumberOrNull(form.mentalHealthRating),
                        exercise_hours_per_week: toNumberOrNull(form.exerciseFrequency),
                        sleep_hours_per_night: toNumberOrNull(form.sleepHours),
                        study_hours_per_day: toNumberOrNull(form.studyHoursPerDay)
                    },
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error ?? "Unable to create your profile right now.");
            }

            sessionStoreActions.setStudentId(payload?.student_id ?? null);
            window.sessionStorage.setItem("auth_intent", "signin");
            window.location.replace("/");
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to create your profile right now.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isCheckingProfile) {
        return (
            <AppShell>
                <section className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-center">
                    <Loading />
                    <p className="text-sm text-gray-200">Preparing your onboarding...</p>
                </section>
            </AppShell>
        );
    }

    if (!authId) {
        return (
            <AppShell>
                <section className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
                    <h1 className="text-3xl font-bold text-white">Onboarding</h1>
                    <p className="text-sm max-w-xs text-gray-300">Sign in to finish creating your student profile.</p>
                    <Link
                        href="/"
                        onClick={handleBackToSignIn}
                        className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-[#091f1c] transition-colors hover:bg-cyan-400"
                    >
                        Back to sign in
                    </Link>
                </section>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <header className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <Sparkles className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Onboarding</h1>
                    <p className="text-sm text-gray-400">Set up your student profile before you create courses.</p>
                </div>
            </header>

            <section className="rounded-3xl border border-[#1b3f3a] bg-[#132e2a] p-5 shadow-lg shadow-black/10">
                <div className="mb-5 rounded-2xl border border-[#1b3f3a] bg-[#0a1816] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step {step} of 2</p>
                    <p className="mt-1 text-sm text-gray-300">
                        {step === 1 ? "Identity and account basics" : "Student habits for future course setup"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {step === 1 ? (
                        <>
                            <label className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-gray-300">Name</span>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange("name")}
                                    placeholder="Ada Lovelace"
                                    className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Nickname</span>
                                    <input
                                        type="text"
                                        value={form.nickname}
                                        onChange={handleChange("nickname")}
                                        placeholder="Optional"
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Student ID</span>
                                    <input
                                        type="text"
                                        value={form.studentId}
                                        onChange={handleChange("studentId")}
                                        placeholder="S1234567"
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Gender</span>
                                    <select
                                        value={form.gender}
                                        onChange={handleChange("gender")}
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    >
                                        <option value="">Select gender</option>
                                        <option value="female">Female</option>
                                        <option value="male">Male</option>
                                        <option value="other">Other</option>
                                        <option value="prefer_not_to_say">Prefer not to say</option>
                                    </select>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Age</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.age}
                                        onChange={handleChange("age")}
                                        placeholder="20"
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    />
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Mental health rating</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={form.mentalHealthRating}
                                        onChange={handleChange("mentalHealthRating")}
                                        placeholder="8"
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Exercise hours / week</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.exerciseFrequency}
                                        onChange={handleChange("exerciseFrequency")}
                                        placeholder="3"
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-xs font-semibold text-gray-300">Sleep hours / night</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={form.sleepHours}
                                        onChange={handleChange("sleepHours")}
                                        placeholder="7.5"
                                        className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                    />
                                </label>
                            </div>
                            <label className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-gray-300">Study hours / day</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={form.studyHoursPerDay}
                                    onChange={handleChange("studyHoursPerDay")}
                                    placeholder="3"
                                    className="w-full rounded-xl border border-[#1b3f3a] bg-[#0a1816] p-3 text-white focus:border-cyan-400 focus:outline-none"
                                />
                            </label>
                            <div className="rounded-2xl border border-dashed border-[#204843] bg-[#0a1816] p-4 text-sm text-gray-300">
                                These habits are saved with your student profile now and reused when you create a course.
                            </div>
                        </>
                    )}

                    {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}

                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            disabled={step === 1}
                            className="rounded-xl border border-[#1b3f3a] px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-cyan-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Back
                        </button>

                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={handleContinue}
                                disabled={!isStep1Valid}
                                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#091f1c] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting || !isStep2Valid}
                                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#091f1c] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "Creating profile..." : "Finish onboarding"}
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm text-gray-400">
                <Link href="/" onClick={handleBackToSignIn} className="transition-colors hover:text-white">
                    Back to sign in
                </Link>
                <span>Course details are added after onboarding.</span>
            </div>
        </AppShell>
    );
}
