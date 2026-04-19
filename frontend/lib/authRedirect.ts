const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, "");
}

export function getAuthRedirectUrl(pathname: string): string {
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    // OAuth PKCE flow stores verifier data per-origin in browser storage.
    // Always using the current origin avoids cross-domain callback mismatches.
    const browserOrigin = normalizeBaseUrl(window.location.origin);
    const baseUrl = browserOrigin || (configuredSiteUrl ? normalizeBaseUrl(configuredSiteUrl) : browserOrigin);
    return `${baseUrl}${normalizedPath}`;
}
