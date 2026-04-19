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
                ? "Unexpected response from backend"
                : "Backend returned a non-JSON error response",
        };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
    const response = await fetch(`${backendUrl}/api/focus-sessions/${encodeURIComponent(studentId)}`, {
        cache: "no-store",
    });

    const payload = await parseBackendPayload(response);
    return Response.json(payload, { status: response.status });
}

export async function POST(request: Request) {
    const payload = await request.json();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
    const response = await fetch(`${backendUrl}/api/focus-sessions/${encodeURIComponent(studentId)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    const responsePayload = await parseBackendPayload(response);
    return Response.json(responsePayload, { status: response.status });
}
