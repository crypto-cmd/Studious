"use client";

import { supabase } from "@lib/supabase";

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
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

// Example Login Button Component
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