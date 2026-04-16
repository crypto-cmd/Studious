"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import BottomNav, { TabId } from "./components/BottomNav";
import ComingSoon from "./components/ComingSoon";
import HomeDashboard from "./pages/HomeDashboard";
import TaskManager from "./pages/TasksManager";
import { supabase } from "../lib/supabase";
import SignOutButton from "./components/SignOutButton";

type AuthIntent = "signin" | "signup" | null;

export default function App() {
  const [authId, setAuthId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | number | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [defaultProfileName, setDefaultProfileName] = useState<string>("");
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [signupName, setSignupName] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");

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
        setAuthId(session.user.id);
        const seededName =
          (session.user.user_metadata?.name as string | undefined) ||
          (session.user.user_metadata?.full_name as string | undefined) ||
          session.user.email?.split("@")[0] ||
          "";
        setDefaultProfileName(seededName);
      } else {
        setAuthId(null);
        setStudentId(null);
        setDefaultProfileName("");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthId(session.user.id);
        const seededName =
          (session.user.user_metadata?.name as string | undefined) ||
          (session.user.user_metadata?.full_name as string | undefined) ||
          session.user.email?.split("@")[0] ||
          "";
        setDefaultProfileName(seededName);
      } else {
        setAuthId(null);
        setStudentId(null);
        setStudentName(null);
        setDefaultProfileName("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authId) {
      setStudentName(null);
      setStudentId(null);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;
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
            setAuthId(null);
            setAuthIntent(null);
            window.sessionStorage.removeItem("auth_intent");
            setStudentName(null);
            setStudentId(null);
            setIsProfileLoading(false);
            return;
          }

          if (response.status !== 404) {
            console.error("Error loading student profile:", payload?.error ?? response.statusText);
          }
          setStudentName(null);
          setStudentId(null);
          setIsProfileLoading(false);
          return;
        }

        setStudentName(payload?.name ?? null);
        setStudentId(payload?.student_id ?? null);
        setIsProfileLoading(false);
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
          setAuthId(null);
          setAuthIntent(null);
          window.sessionStorage.removeItem("auth_intent");
        }

        console.error("Error loading student profile:", error);
        setStudentName(null);
        setStudentId(null);
        setIsProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authId]);

  useEffect(() => {
    if (authIntent === "signup" && !studentName && !signupName) {
      setSignupName(defaultProfileName);
    }
  }, [authIntent, defaultProfileName, studentName, signupName]);

  const signInWithGoogle = async (intent: Exclude<AuthIntent, null>) => {
    setAuthError(null);
    setAuthIntent(intent);
    window.sessionStorage.setItem("auth_intent", intent);

    const redirectTo = `${window.location.origin}${window.location.pathname}?intent=${intent}`;
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
    if (!nextName) {
      setAuthError("Please enter your name before continuing.");
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
          name: nextName,
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
      setStudentId(payload?.student_id ?? null);
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
        return <HomeDashboard studentName={studentName} studentId={studentId} />;
      case "tasks":
        return <TaskManager />;
      case "timer":
        return (
          <ComingSoon
            title="Study Timer"
            description="Focus sessions and break tracking will appear here."
          />
        );
      case "analytics":
        return (
          <ComingSoon
            title="Analytics"
            description="Performance trends and predictions will appear here."
          />
        );
      case "calendar":
        return (
          <ComingSoon
            title="Calendar"
            description="Your schedule and deadlines will appear here."
          />
        );
      default:
        return <HomeDashboard studentName={studentName} studentId={studentId} />;
    }
  }, [activeTab, studentId, studentName]);

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
          <p className="text-gray-200 text-sm">Loading your profile...</p>
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
              Confirm your name below. You can edit it before we create your student profile.
            </p>
            <form onSubmit={handleSignupSubmit} className="w-full max-w-xs flex flex-col gap-3">
              <input
                type="text"
                value={signupName}
                onChange={(event) => setSignupName(event.target.value)}
                placeholder="Your full name"
                className="w-full bg-[#132e2a] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isCreatingProfile}
                className="bg-cyan-500 text-[#091f1c] font-bold py-3 px-6 rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-60"
              >
                {isCreatingProfile ? "Creating profile..." : "Create account"}
              </button>
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
        <SignOutButton />
      </div>
      <div key={activeTab} className="tab-page-enter">
        {activeContent}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </AppShell>
  );
}
