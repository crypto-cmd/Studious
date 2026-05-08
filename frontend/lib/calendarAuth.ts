import type { Session } from '@supabase/supabase-js';

export const GOOGLE_CALENDAR_SCOPE = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export type CalendarCredentialsPayload = {
    google_calendar_id: string;
    google_calendar_access_token: string;
    google_calendar_refresh_token: string | null;
};

export function getGoogleCalendarOAuthOptions(redirectTo: string) {
    return {
        redirectTo,
        queryParams: {
            access_type: 'offline',
            prompt: 'consent',
        },
        scopes: `openid email profile ${GOOGLE_CALENDAR_SCOPE}`,
    };
}

export function extractCalendarCredentials(session: Session | null | undefined): CalendarCredentialsPayload | null {
    const providerAccessToken = session?.provider_token?.trim();

    if (!providerAccessToken) {
        return null;
    }

    return {
        google_calendar_id: 'primary',
        google_calendar_access_token: providerAccessToken,
        google_calendar_refresh_token: session?.provider_refresh_token?.trim() || null,
    };
}