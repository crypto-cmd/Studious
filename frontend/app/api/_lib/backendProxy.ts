type BackendRequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: HeadersInit;
    cache?: RequestCache;
};

type BackendPayloadResult = {
    response: Response;
    payload: unknown;
};


function buildRequestInit(options: BackendRequestOptions): RequestInit {
    const method = options.method ?? 'GET';

    const headers = new Headers(options.headers);

    if (process.env.HF_TOKEN) {
        headers.set('Authorization', `Bearer ${process.env.HF_TOKEN}`);
    }

    if (options.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const init: RequestInit = {
        method,
        cache: options.cache ?? 'no-store',
        headers,
    };

    if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
    }

    return init;
}

async function parseBackendPayload(response: Response) {
    const textPayload = await response.text();

    if (!textPayload) {
        return null;
    }

    try {
        return JSON.parse(textPayload);
    } catch {
        console.error(`[Backend Proxy] Non-JSON response (status ${response.status}):`, textPayload.substring(0, 500));
        return {
            error: response.ok
                ? 'Unexpected response from backend'
                : `Backend error: ${textPayload.substring(0, 200)}`,
        };
    }
}

export async function fetchBackendPayload(
    path: string,
    options: BackendRequestOptions = {}
): Promise<BackendPayloadResult> {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendBaseUrl) {
        return {
            response: new Response(null, { status: 500, statusText: 'Missing backend URL configuration' }),
            payload: {
                error: 'Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL and restart the frontend server.',
            },
        };
    }

    let response: Response;

    try {
        response = await fetch(`${backendBaseUrl}${path}`, buildRequestInit(options));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error while contacting backend';

        return {
            response: new Response(null, { status: 503, statusText: 'Backend unavailable' }),
            payload: {
                error: `Backend is unavailable (${message}). Ensure the backend server is running and NEXT_PUBLIC_BACKEND_URL is correct.`,
            },
        };
    }

    const payload = await parseBackendPayload(response);

    return { response, payload };
}

export async function proxyBackend(
    path: string,
    options: BackendRequestOptions = {}
): Promise<Response> {
    const { response, payload } = await fetchBackendPayload(path, options);
    return Response.json(payload, { status: response.status });
}
