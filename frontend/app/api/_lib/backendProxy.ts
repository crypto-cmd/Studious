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
        return {
            error: response.ok
                ? 'Unexpected response from backend'
                : 'Backend returned a non-JSON error response',
        };
    }
}

export async function fetchBackendPayload(
    path: string,
    options: BackendRequestOptions = {}
): Promise<BackendPayloadResult> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, buildRequestInit(options));
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
