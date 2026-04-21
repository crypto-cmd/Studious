"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  name: string;
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
  name: "",
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
const PROFILE_FETCH_MAX_ATTEMPTS = 3;
const PROFILE_FETCH_RETRY_DELAY_MS = 450;
const PROFILE_FETCH_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStudentProfileWithRetry(authId: string) {
  const profileUrl = `/api/student-profile?auth_id=${encodeURIComponent(authId)}`;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= PROFILE_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(profileUrl, {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (response.ok) {
        return { response, payload };
      }

      if (!PROFILE_FETCH_RETRYABLE_STATUSES.has(response.status) || attempt === PROFILE_FETCH_MAX_ATTEMPTS) {
        return { response, payload };
      }
    } catch (error) {
      lastError = error;

      if (attempt === PROFILE_FETCH_MAX_ATTEMPTS) {
        throw error;
      }
    }

    await wait(PROFILE_FETCH_RETRY_DELAY_MS * attempt);
  }

  throw lastError ?? new Error("Unable to load student profile");
}

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

  return {
    name: seededName.trim(),
    nickname: seededName.trim(),
  } satisfies SignupDefaults;
}

function SearchParamSync({
  onTabParam,
  onCourseParam,
}: {
  onTabParam: (tab: TabId) => void;
  onCourseParam: (courseCode: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const courseFromUrl = searchParams.get("course");

    if (tabFromUrl === "analytics" || tabFromUrl === "home" || tabFromUrl === "tasks" || tabFromUrl === "timer" || tabFromUrl === "calendar") {
      onTabParam(tabFromUrl as TabId);
    }

    if (courseFromUrl) {
      onCourseParam(courseFromUrl);
    }
  }, [onCourseParam, onTabParam, searchParams]);

  return null;
}

export default function App() {
  const router = useRouter();
  const pathname = usePathname();
  const authId = useSessionStore((snapshot) => snapshot.authId);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [defaultSignupProfile, setDefaultSignupProfile] = useState<SignupDefaults>(EMPTY_SIGNUP_DEFAULTS);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [signupName, setSignupName] = useState<string>("");
  const [signupNickname, setSignupNickname] = useState<string>("");
  const [signupStudentId, setSignupStudentId] = useState<string>("");
  const [signupGender, setSignupGender] = useState<string>("");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>(EMPTY_ONBOARDING_FORM);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastAuthEvent, setLastAuthEvent] = useState<string>("INIT");
  const [lastProfileStatus, setLastProfileStatus] = useState<number | null>(null);
  const [hasAuthHashTokens, setHasAuthHashTokens] = useState<boolean>(false);
  const [isProbablyInAppBrowser, setIsProbablyInAppBrowser] = useState<boolean>(false);
  const [hasCopiedDiagnostics, setHasCopiedDiagnostics] = useState<boolean>(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>("");

  const resetSignupForm = () => {
    setSignupName("");
    setSignupNickname("");
    setSignupStudentId("");
    setSignupGender("");
    setOnboardingStep(1);
    setOnboardingForm(EMPTY_ONBOARDING_FORM);
  };

  useEffect(() => {
    const userAgent = window.navigator.userAgent || "";
    const inAppBrowserPattern = /FBAN|FBAV|Instagram|Line|; wv\)|WebView/i;
    setIsProbablyInAppBrowser(inAppBrowserPattern.test(userAgent));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    const hashLooksLikeAuthCallback = /access_token=|refresh_token=|error=|error_description=/.test(hash);
    setHasAuthHashTokens(hashLooksLikeAuthCallback);

    const oauthError = params.get("error_description") || params.get("error") || params.get("error_code");

    if (oauthError) {
      setAuthError(`OAuth callback error: ${oauthError}`);
    }

    const intentFromUrl = params.get("intent");

    if (intentFromUrl === "signin" || intentFromUrl === "signup") {
      setAuthIntent(intentFromUrl);
      window.sessionStorage.setItem("auth_intent", intentFromUrl);
      params.delete("intent");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${hash}`;
      window.history.replaceState({}, "", nextUrl);
      return;
    }

    const storedIntent = window.sessionStorage.getItem("auth_intent");
    if (storedIntent === "signin" || storedIntent === "signup") {
      setAuthIntent(storedIntent);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) {
        return;
      }

      if (session?.user) {
        setLastAuthEvent("SESSION_FOUND");
        sessionStoreActions.setAuthId(session.user.id);
        setDefaultSignupProfile(buildSignupDefaults(session.user));
      } else {
        setLastAuthEvent("SESSION_MISSING");
        sessionStoreActions.clear();
        setDefaultSignupProfile(EMPTY_SIGNUP_DEFAULTS);
        resetSignupForm();
      }

      setIsAuthInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setLastAuthEvent(event);

      if (session?.user) {
        sessionStoreActions.setAuthId(session.user.id);
        setDefaultSignupProfile(buildSignupDefaults(session.user));
      } else {
        sessionStoreActions.clear();
        setStudentName(null);
        setDefaultSignupProfile(EMPTY_SIGNUP_DEFAULTS);
        resetSignupForm();
      }

      setIsAuthInitializing(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const exchangeOAuthCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (isCancelled) {
        return;
      }

      if (error) {
        setAuthError(`Unable to complete sign in: ${error.message}`);
        return;
      }

      if (data.session?.user?.id) {
        sessionStoreActions.setAuthId(data.session.user.id);
      }

      params.delete("code");
      params.delete("state");
      params.delete("error");
      params.delete("error_code");
      params.delete("error_description");

      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    };

    exchangeOAuthCode();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authId) {
      setStudentName(null);
      sessionStoreActions.setStudentId(null);
      setIsProfileLoading(false);
      setLastProfileStatus(null);
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
    setAuthError(null);

    fetchStudentProfileWithRetry(authId)
      .then(async ({ response, payload }) => {

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setLastProfileStatus(response.status);

          if ((response.status === 401 || response.status === 403 || response.status === 404) && authIntent === "signin") {
            // Sign in attempt failed - the account could not be verified against an existing profile.
            await supabase.auth.signOut().catch(() => { });
            setAuthError(
              response.status === 404
                ? "This account doesn't have a student profile. Please sign up to create one."
                : "Unable to verify your account. Please try signing in again."
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
            setAuthError(payload?.error ?? "Unable to load your profile right now.");
          }
          setStudentName(null);
          sessionStoreActions.setStudentId(null);
          finishLoading();
          return;
        }

        setLastProfileStatus(response.status);
        const resolvedName = payload?.name ?? payload?.nickname ?? null;
        setStudentName(resolvedName || null);
        sessionStoreActions.setStudentId(payload?.student_id ?? null);
        if (authIntent === "signup") {
          setAuthIntent("signin");
          window.sessionStorage.setItem("auth_intent", "signin");
        }
        finishLoading();
      })
      .catch(async (error: unknown) => {
        if (!isMounted) {
          return;
        }

        console.error("Error loading student profile:", error);
        setLastProfileStatus(-1);
        setAuthError("Temporary connection issue while loading your profile. Please wait a moment and try again.");
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
      if (!signupName && defaultSignupProfile.name) {
        setSignupName(defaultSignupProfile.name);
      }
      if (!signupNickname && defaultSignupProfile.nickname) {
        setSignupNickname(defaultSignupProfile.nickname);
      }
    }
  }, [authIntent, defaultSignupProfile.name, defaultSignupProfile.nickname, signupName, signupNickname]);

  useEffect(() => {
    if (authId && authIntent === "signup" && lastProfileStatus === 404) {
      window.location.replace("/onboarding");
    }
  }, [authId, authIntent, lastProfileStatus]);

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

    const nextName = signupName.trim();
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

    if (!nextName || !nextStudentId || !signupGender || age == null) {
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
          nickname: nextNickname || null,
          student_id: nextStudentId,
          gender: signupGender,
          age,
          name: nextName,
          onboarding: {
            course_code: nextCourseCode,
            final_exam_date: onboardingForm.finalExamDate,
            attendance_percentage: attendancePercentage,
            sleep_hours_per_night: sleepHours,
            exercise_hours_per_week: exerciseFrequency,
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
      setStudentName(payload?.name ?? nextName);
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

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("tab", tab);
    if (tab !== "analytics") {
      nextParams.delete("course");
    }

    const nextUrl = `${pathname}?${nextParams.toString()}`;

    const docWithTransition = document as Document & {
      startViewTransition?: (update: () => void) => void;
    };

    if (typeof docWithTransition.startViewTransition === "function") {
      docWithTransition.startViewTransition(() => {
        setActiveTab(tab);
        router.replace(nextUrl);
      });
      return;
    }

    setActiveTab(tab);
    router.replace(nextUrl);
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
          <Analytics selectedCourseCode={selectedCourseCode} />
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
  }, [activeTab, selectedCourseCode, studentName]);

  const copyDiagnostics = async () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      intent: authIntent,
      authIdPresent: Boolean(authId),
      isAuthInitializing,
      isProfileLoading,
      lastAuthEvent,
      lastProfileStatus,
      hasAuthHashTokens,
      isProbablyInAppBrowser,
      userAgent: window.navigator.userAgent,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setHasCopiedDiagnostics(true);
      setTimeout(() => setHasCopiedDiagnostics(false), 2000);
    } catch {
      setAuthError("Could not copy diagnostics. You can still screenshot this section.");
    }
  };

  if (isAuthInitializing) {
    return (
      <AppShell>
        <section className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-center">
          <Loading />
          <p className="text-gray-200 text-sm">Checking your session...</p>
        </section>
      </AppShell>
    );
  }

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
          <div className="w-full max-w-sm rounded-2xl border border-[#1b3f3a] bg-[#132e2a] p-4 text-left">
            <p className="text-xs font-semibold text-cyan-300">Phone sign-in diagnostics</p>
            <p className="text-xs text-gray-300 mt-2">Last auth event: {lastAuthEvent}</p>
            <p className="text-xs text-gray-300">Last profile status: {lastProfileStatus ?? "none"}</p>
            <p className="text-xs text-gray-300">Auth hash tokens seen: {hasAuthHashTokens ? "yes" : "no"}</p>
            {isProbablyInAppBrowser && (
              <p className="text-xs text-amber-300 mt-2">
                In-app browser detected. Open this page in Safari or Chrome to avoid OAuth cookie/session restrictions.
              </p>
            )}
            <button
              type="button"
              onClick={copyDiagnostics}
              className="mt-3 w-full border border-[#24524b] text-gray-100 font-semibold py-2 rounded-xl hover:bg-[#173732] transition-colors"
            >
              {hasCopiedDiagnostics ? "Diagnostics copied" : "Copy diagnostics"}
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
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-300">Name</label>
                    <input
                      type="text"
                      value={signupName}
                      onChange={(event) => setSignupName(event.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                    />
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
                      <span className="text-xs font-semibold text-gray-300">Exercise (hrs/week)</span>
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
                    <span className="text-xs font-semibold text-gray-300">Study time (hrs/week)</span>
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
      <Suspense fallback={null}>
        <SearchParamSync onTabParam={setActiveTab} onCourseParam={setSelectedCourseCode} />
      </Suspense>
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
