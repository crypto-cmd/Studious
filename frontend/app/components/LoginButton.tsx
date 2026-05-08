"use client";

import { supabase } from "@lib/supabase";
import { getAuthRedirectUrl } from "@lib/authRedirect";
import { getGoogleCalendarOAuthOptions } from "@lib/calendarAuth";

export async function signInWithGoogle() {
  const redirectTo = getAuthRedirectUrl(window.location.pathname);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: getGoogleCalendarOAuthOptions(redirectTo),
  });

  if (error) {
    console.error('Error signing in:', error.message);
  }
}

export default function LoginButton() {
  return (
    <button
      onClick={signInWithGoogle}
      className="bg-white text-gray-900 font-bold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-gray-100 transition-colors"
    >
      <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
      Connect Google Calendar
    </button>
  );
}