const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, "");
}

export function getAuthRedirectUrl(pathname: string): string {
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const baseUrl = configuredSiteUrl ? normalizeBaseUrl(configuredSiteUrl) : window.location.origin;
    return `${baseUrl}${normalizedPath}`;
}
