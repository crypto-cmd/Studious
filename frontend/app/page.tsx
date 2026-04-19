"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@components/AppShell";
import BottomNav, { TabId } from "@components/BottomNav";
import ComingSoon from "@components/ComingSoon";
import HomeDashboard from "@pages/HomeDashboard";
import TaskManager from "@pages/TasksManager";
import FocusTimer from "@pages/FocusTimer";
import { supabase } from "@lib/supabase";
import { getAuthRedirectUrl } from "@lib/authRedirect";
import { sessionStoreActions, useSessionStore } from "@lib/sessionStore";
import SignOutButton from "@components/SignOutButton";
import Analytics from "@pages/Analytics";
import ProfileButton from "@components/ProfileButton";
import Loading from "@components/Loading";

type AuthIntent = "signin" | "signup" | null;

type SignupDefaults = {
  firstname: string;
  lastname: string;
  nickname: string;
};

type OnboardingStep = 1 | 2 | 3;

type OnboardingForm = {
  age: string;
  attendancePercentage: string;
  sleepHours: string;
  exerciseFrequency: string;
  mentalHealthRating: string;
  studyHoursPerDay: string;
  courseCode: string;
  finalExamDate: string;
  currentPredictedGrade: string;
  finalPredictedGrade: string;
};

const EMPTY_SIGNUP_DEFAULTS: SignupDefaults = {
  firstname: "",
  lastname: "",
  nickname: "",
};

const EMPTY_ONBOARDING_FORM: OnboardingForm = {
  age: "",
  attendancePercentage: "",
  sleepHours: "",
  exerciseFrequency: "",
  mentalHealthRating: "",
  studyHoursPerDay: "",
  courseCode: "",
  finalExamDate: "",
  currentPredictedGrade: "",
  finalPredictedGrade: "",
};

const MIN_LOGIN_LOADING_MS = 2000;

function buildSignupDefaults(sessionUser: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}) {
  const seededName =
    (sessionUser.user_metadata?.nickname as string | undefined) ||
    (sessionUser.user_metadata?.name as string | undefined) ||
    (sessionUser.user_metadata?.full_name as string | undefined) ||
    sessionUser.email?.split("@")[0] ||
    "";

  const nameParts = seededName.trim().split(/\s+/).filter(Boolean);
  return {
    firstname: nameParts[0] ?? "",
    lastname: nameParts.slice(1).join(" "),
    nickname: seededName.trim(),
  } satisfies SignupDefaults;
}

function buildDisplayName(firstname: string, lastname: string, nickname: string) {
  return nickname.trim() || [firstname.trim(), lastname.trim()].filter(Boolean).join(" ");
}

export default function App() {
  const authId = useSessionStore((snapshot) => snapshot.authId);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [defaultSignupProfile, setDefaultSignupProfile] = useState<SignupDefaults>(EMPTY_SIGNUP_DEFAULTS);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [signupFirstname, setSignupFirstname] = useState<string>("");
  const [signupLastname, setSignupLastname] = useState<string>("");
  const [signupNickname, setSignupNickname] = useState<string>("");
  const [signupStudentId, setSignupStudentId] = useState<string>("");
  const [signupGender, setSignupGender] = useState<string>("");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>(EMPTY_ONBOARDING_FORM);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");

  const resetSignupForm = () => {
    setSignupFirstname("");
    setSignupLastname("");
    setSignupNickname("");
    setSignupStudentId("");
    setSignupGender("");
    setOnboardingStep(1);
    setOnboardingForm(EMPTY_ONBOARDING_FORM);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intentFromUrl = params.get("intent");

    if (intentFromUrl === "signin" || intentFromUrl === "signup") {
      setAuthIntent(intentFromUrl);
      window.sessionStorage.setItem("auth_intent", intentFromUrl);
      params.delete("intent");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
      return;
    }

    const storedIntent = window.sessionStorage.getItem("auth_intent");
    if (storedIntent === "signin" || storedIntent === "signup") {
      setAuthIntent(storedIntent);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStoreActions.setAuthId(session.user.id);
        setDefaultSignupProfile(buildSignupDefaults(session.user));
      } else {
        sessionStoreActions.clear();
        setDefaultSignupProfile(EMPTY_SIGNUP_DEFAULTS);
        resetSignupForm();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        sessionStoreActions.setAuthId(session.user.id);
        setDefaultSignupProfile(buildSignupDefaults(session.user));
      } else {
        sessionStoreActions.clear();
        setStudentName(null);
        setDefaultSignupProfile(EMPTY_SIGNUP_DEFAULTS);
        resetSignupForm();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authId) {
      setStudentName(null);
      sessionStoreActions.setStudentId(null);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;
    let loadingFinished = false;
    let finishTimeout: ReturnType<typeof setTimeout> | null = null;
    const loadingStartedAt = Date.now();

    const finishLoading = () => {
      if (!isMounted || loadingFinished) {
        return;
      }

      loadingFinished = true;
      const elapsed = Date.now() - loadingStartedAt;
      const remaining = Math.max(0, MIN_LOGIN_LOADING_MS - elapsed);

      if (remaining === 0) {
        setIsProfileLoading(false);
        return;
      }

      finishTimeout = setTimeout(() => {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }, remaining);
    };

    setIsProfileLoading(true);

    fetch(`/api/student-profile?auth_id=${encodeURIComponent(authId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          if (response.status === 404 && authIntent === "signin") {
            // Sign in attempt failed - no profile exists. Sign out and show error.
            await supabase.auth.signOut().catch(() => { });
            setAuthError(
              "This account doesn't have a student profile. Please sign up to create one."
            );
            sessionStoreActions.setAuthId(null);
            setAuthIntent(null);
            window.sessionStorage.removeItem("auth_intent");
            setStudentName(null);
            sessionStoreActions.setStudentId(null);
            finishLoading();
            return;
          }

          if (response.status !== 404) {
            console.error("Error loading student profile:", payload?.error ?? response.statusText);
          }
          setStudentName(null);
          sessionStoreActions.setStudentId(null);
          finishLoading();
          return;
        }

        const resolvedName = payload?.name ?? buildDisplayName(
          payload?.firstname ?? "",
          payload?.lastname ?? "",
          payload?.nickname ?? ""
        );
        setStudentName(resolvedName || null);
        sessionStoreActions.setStudentId(payload?.student_id ?? null);
        finishLoading();
      })
      .catch(async (error: unknown) => {
        if (!isMounted) {
          return;
        }

        // If signin attempt fails, sign them out
        if (authIntent === "signin") {
          await supabase.auth.signOut().catch(() => { });
          setAuthError(
            "Unable to verify your account. Please try signing in again."
          );
          sessionStoreActions.setAuthId(null);
          setAuthIntent(null);
          window.sessionStorage.removeItem("auth_intent");
        }

        console.error("Error loading student profile:", error);
        setStudentName(null);
        sessionStoreActions.setStudentId(null);
        finishLoading();
      });

    return () => {
      isMounted = false;
      if (finishTimeout) {
        clearTimeout(finishTimeout);
      }
    };
  }, [authId, authIntent]);

  useEffect(() => {
    if (authIntent === "signup") {
      if (!signupFirstname && defaultSignupProfile.firstname) {
        setSignupFirstname(defaultSignupProfile.firstname);
      }
      if (!signupLastname && defaultSignupProfile.lastname) {
        setSignupLastname(defaultSignupProfile.lastname);
      }
      if (!signupNickname && defaultSignupProfile.nickname) {
        setSignupNickname(defaultSignupProfile.nickname);
      }
    }
  }, [authIntent, defaultSignupProfile.firstname, defaultSignupProfile.lastname, defaultSignupProfile.nickname, signupFirstname, signupLastname, signupNickname]);

  useEffect(() => {
    if (authId && authIntent === "signup") {
      window.location.replace("/onboarding");
    }
  }, [authId, authIntent]);

  const signInWithGoogle = async (intent: Exclude<AuthIntent, null>) => {
    setAuthError(null);
    setAuthIntent(intent);
    window.sessionStorage.setItem("auth_intent", intent);

    const redirectPath = intent === "signup" ? "/onboarding" : window.location.pathname;
    const redirectTo = `${getAuthRedirectUrl(redirectPath)}?intent=${intent}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authId) {
      return;
    }

    const nextFirstname = signupFirstname.trim();
    const nextLastname = signupLastname.trim();
    const nextNickname = signupNickname.trim();
    const nextStudentId = signupStudentId.trim();
    const nextCourseCode = onboardingForm.courseCode.trim().toUpperCase();

    const toNumberOrNull = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const age = toNumberOrNull(onboardingForm.age);
    const attendancePercentage = toNumberOrNull(onboardingForm.attendancePercentage);
    const sleepHours = toNumberOrNull(onboardingForm.sleepHours);
    const exerciseFrequency = toNumberOrNull(onboardingForm.exerciseFrequency);
    const mentalHealthRating = toNumberOrNull(onboardingForm.mentalHealthRating);
    const studyHoursPerDay = toNumberOrNull(onboardingForm.studyHoursPerDay);
    const currentPredictedGrade = toNumberOrNull(onboardingForm.currentPredictedGrade);
    const finalPredictedGrade = toNumberOrNull(onboardingForm.finalPredictedGrade);

    if (!nextFirstname || !nextLastname || !nextNickname || !nextStudentId || !signupGender || age == null) {
      setAuthError("Complete your profile basics, including age, before continuing.");
      return;
    }

    if (!nextCourseCode || !onboardingForm.finalExamDate) {
      setAuthError("Add your first course code and expected final exam date to finish onboarding.");
      return;
    }

    setIsCreatingProfile(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/student-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_id: authId,
          firstname: nextFirstname,
          lastname: nextLastname,
          nickname: nextNickname,
          student_id: nextStudentId,
          gender: signupGender,
          age,
          name: buildDisplayName(nextFirstname, nextLastname, nextNickname),
          onboarding: {
            course_code: nextCourseCode,
            final_exam_date: onboardingForm.finalExamDate,
            attendance_percentage: attendancePercentage,
            sleep_hours: sleepHours,
            exercise_frequency: exerciseFrequency,
            mental_health_rating: mentalHealthRating,
            study_hours_per_day: studyHoursPerDay,
            current_predicted_grade: currentPredictedGrade,
            final_predicted_grade: finalPredictedGrade,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setAuthError(payload?.error ?? "Unable to create your profile right now.");
        return;
      }

      window.sessionStorage.setItem("auth_intent", "signin");
      setAuthIntent("signin");
      setStudentName(payload?.name ?? buildDisplayName(nextFirstname, nextLastname, nextNickname));
      sessionStoreActions.setStudentId(payload?.student_id ?? null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to create your profile right now.");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleTabChange = (tab: TabId) => {
    if (tab === activeTab) {
      return;
    }

    const docWithTransition = document as Document & {
      startViewTransition?: (update: () => void) => void;
    };

    if (typeof docWithTransition.startViewTransition === "function") {
      docWithTransition.startViewTransition(() => {
        setActiveTab(tab);
      });
      return;
    }

    setActiveTab(tab);
  };

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "home":
        return <HomeDashboard studentName={studentName} />;
      case "tasks":
        return <TaskManager />;
      case "timer":
        return (
          <FocusTimer />
        );
      case "analytics":
        return (
          <Analytics />
        );
      case "calendar":
        return (
          <ComingSoon
            title="Calendar"
            description="Your schedule and deadlines will appear here."
          />
        );
      default:
        return <HomeDashboard studentName={studentName} />;
    }
  }, [activeTab, studentName]);

  if (!authId) {
    return (
      <AppShell>
        <section className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to Studious</h1>
          <p className="text-gray-300 text-sm max-w-xs">
            Continue with Google to sign in to an existing profile or create a new one.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => signInWithGoogle("signin")}
              className="bg-white text-gray-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={() => signInWithGoogle("signup")}
              className="bg-cyan-500 text-[#091f1c] font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors"
            >
              <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
              Sign up with Google
            </button>
          </div>
          {authError && <p className="text-red-300 text-sm max-w-xs">{authError}</p>}
        </section>
      </AppShell>
    );
  }

  if (isProfileLoading) {
    return (
      <AppShell>
        <section className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-center">
          <Loading />
          <p className="text-gray-200 text-sm">Signing you in...</p>
        </section>
      </AppShell>
    );
  }

  if (!studentName) {
    if (authIntent === "signup") {
      return (
        <AppShell>
          <section className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
            <h1 className="text-3xl font-bold text-white">Finish your sign up</h1>
            <p className="text-gray-300 text-sm max-w-xs">
              Tell us how you want your profile to appear and we’ll create your student account.
            </p>
            <form onSubmit={handleSignupSubmit} className="w-full max-w-sm flex flex-col gap-4 text-left">
              <div className="rounded-2xl border border-[#1b3f3a] bg-[#132e2a] p-3">
                <p className="text-xs font-semibold text-cyan-300">Step {onboardingStep} of 3</p>
                <p className="text-xs text-gray-400 mt-1">
                  {onboardingStep === 1 && "Identity and account basics"}
                  {onboardingStep === 2 && "Study habits and learning profile"}
                  {onboardingStep === 3 && "Initial course setup"}
                </p>
              </div>

              {onboardingStep === 1 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-300">First name</label>
                      <input
                        type="text"
                        value={signupFirstname}
                        onChange={(event) => setSignupFirstname(event.target.value)}
                        placeholder="Ada"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-300">Last name</label>
                      <input
                        type="text"
                        value={signupLastname}
                        onChange={(event) => setSignupLastname(event.target.value)}
                        placeholder="Lovelace"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-300">Nickname</label>
                    <input
                      type="text"
                      value={signupNickname}
                      onChange={(event) => setSignupNickname(event.target.value)}
                      placeholder="Adele"
                      className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-300">Student ID</label>
                      <input
                        type="text"
                        value={signupStudentId}
                        onChange={(event) => setSignupStudentId(event.target.value)}
                        placeholder="20261234"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-300">Age</label>
                      <input
                        type="number"
                        min={10}
                        max={120}
                        value={onboardingForm.age}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, age: event.target.value }))}
                        placeholder="19"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-300">Gender</label>
                    <select
                      value={signupGender}
                      onChange={(event) => setSignupGender(event.target.value)}
                      className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              {onboardingStep === 2 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-gray-300">Attendance (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={onboardingForm.attendancePercentage}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, attendancePercentage: event.target.value }))}
                        placeholder="85"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-gray-300">Sleep (hrs/night)</span>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        value={onboardingForm.sleepHours}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, sleepHours: event.target.value }))}
                        placeholder="7.5"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-gray-300">Exercise (sessions/week)</span>
                      <input
                        type="number"
                        step="1"
                        min={0}
                        value={onboardingForm.exerciseFrequency}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, exerciseFrequency: event.target.value }))}
                        placeholder="3"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-gray-300">Mental health (1-10)</span>
                      <input
                        type="number"
                        step="1"
                        min={1}
                        max={10}
                        value={onboardingForm.mentalHealthRating}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, mentalHealthRating: event.target.value }))}
                        placeholder="7"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-300">Study time (hrs/day)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={onboardingForm.studyHoursPerDay}
                      onChange={(event) => setOnboardingForm((current) => ({ ...current, studyHoursPerDay: event.target.value }))}
                      placeholder="2.5"
                      className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                    />
                  </label>
                </>
              )}

              {onboardingStep === 3 && (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-300">First course code</span>
                    <input
                      type="text"
                      value={onboardingForm.courseCode}
                      onChange={(event) => setOnboardingForm((current) => ({ ...current, courseCode: event.target.value.toUpperCase() }))}
                      placeholder="COMP3901"
                      className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-300">Expected final exam date</span>
                    <input
                      type="date"
                      value={onboardingForm.finalExamDate}
                      onChange={(event) => setOnboardingForm((current) => ({ ...current, finalExamDate: event.target.value }))}
                      className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 [color-scheme:dark]"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-gray-300">Current predicted grade (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        value={onboardingForm.currentPredictedGrade}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, currentPredictedGrade: event.target.value }))}
                        placeholder="72.5"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-gray-300">Expected final grade (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        value={onboardingForm.finalPredictedGrade}
                        onChange={(event) => setOnboardingForm((current) => ({ ...current, finalPredictedGrade: event.target.value }))}
                        placeholder="81.0"
                        className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 pt-1">
                {onboardingStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep((current) => (current > 1 ? ((current - 1) as OnboardingStep) : current))}
                    className="border border-[#1b3f3a] text-gray-200 font-semibold py-2.5 px-4 rounded-xl hover:bg-[#173732] transition-colors"
                  >
                    Back
                  </button>
                )}

                {onboardingStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep((current) => (current < 3 ? ((current + 1) as OnboardingStep) : current))}
                    className="bg-cyan-500 text-[#091f1c] font-bold py-2.5 px-5 rounded-xl hover:bg-cyan-400 transition-colors"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isCreatingProfile}
                    className="bg-cyan-500 text-[#091f1c] font-bold py-2.5 px-5 rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-60"
                  >
                    {isCreatingProfile ? "Creating profile..." : "Create account"}
                  </button>
                )}
              </div>
            </form>
            {authError && <p className="text-red-300 text-sm max-w-xs">{authError}</p>}
            <SignOutButton />
          </section>
        </AppShell>
      );
    }

    return (
      <AppShell>
        <section className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-3xl font-bold text-white">No student profile found</h1>
          <p className="text-gray-300 text-sm max-w-xs">
            Sign in only works for existing students. Use sign up to create your profile first.
          </p>
          <button
            type="button"
            onClick={() => {
              setAuthIntent("signup");
              window.sessionStorage.setItem("auth_intent", "signup");
            }}
            className="bg-cyan-500 text-[#091f1c] font-bold py-3 px-6 rounded-xl hover:bg-cyan-400 transition-colors"
          >
            Continue to sign up
          </button>
          <SignOutButton />
          {authError && <p className="text-red-300 text-sm max-w-xs">{authError}</p>}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex justify-end">
        <ProfileButton studentName={studentName} />
      </div>
      <div key={activeTab} className="tab-page-enter">
        {activeContent}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </AppShell>
  );
}
