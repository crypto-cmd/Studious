export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get("auth_id");

    if (!authId) {
        return Response.json({ error: "Missing auth_id" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
    const response = await fetch(`${backendUrl}/api/students/${authId}`, {
        cache: "no-store",
    });

    const payload = await response.json();
    return Response.json(payload, { status: response.status });
}

export async function POST(request: Request) {
    const payload = await request.json();
    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

    const response = await fetch(`${backendUrl}/api/students`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    const responsePayload = await response.json();
    return Response.json(responsePayload, { status: response.status });
}

export async function PATCH(request: Request) {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get("auth_id");

    if (!authId) {
        return Response.json({ error: "Missing auth_id" }, { status: 400 });
    }

    const payload = await request.json();
    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

    const response = await fetch(`${backendUrl}/api/students/${authId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    const responsePayload = await response.json();
    return Response.json(responsePayload, { status: response.status });
}
