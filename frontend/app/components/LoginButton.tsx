"use client";

import { supabase } from "@lib/supabase";
import { getAuthRedirectUrl } from "@lib/authRedirect";

export async function signInWithGoogle() {
  const redirectTo = getAuthRedirectUrl(window.location.pathname);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Optional: Force a prompt to select account
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
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
      Sign in with Google
    </button>
  );
}