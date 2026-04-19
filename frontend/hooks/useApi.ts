type QueryValue = string | number | boolean | null | undefined;
type Params = Record<string, QueryValue>;

type ApiOptions = {
    cache?: RequestCache;
    headers?: HeadersInit;
    signal?: AbortSignal;
};

type JsonObject = Record<string, unknown>;

function buildApiUrl(route: string, params: Params) {
    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value == null) {
            continue;
        }

        queryParams.append(key, String(value));
    }

    const query = queryParams.toString();
    return `/api/${route}${query ? `?${query}` : ''}`;
}

function mergeHeaders(headers?: HeadersInit): HeadersInit {
    return {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
    };
}

export async function useApi<T = unknown>(
    route: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    params: Params = {},
    body: JsonObject = {},
    options: ApiOptions = {},
    fallbackError = 'Request failed'
): Promise<T> {
    const url = buildApiUrl(route, params);

    const requestInit: RequestInit = {
        method,
        cache: options.cache,
        signal: options.signal,
        headers: mergeHeaders(options.headers),
    };

    if (method !== 'GET' && method !== 'DELETE') {
        requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
                ? payload.error
                : fallbackError;

        throw new Error(message);
    }

    return payload as T;
}
