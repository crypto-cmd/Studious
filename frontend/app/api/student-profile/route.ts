import { proxyBackend } from '../_lib/backendProxy';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get("auth_id");

    if (!authId) {
        return Response.json({ error: "Missing auth_id" }, { status: 400 });
    }

    return proxyBackend(`/api/students/${authId}`);
}

export async function POST(request: Request) {
    const payload = await request.json();

    return proxyBackend('/api/students', {
        method: 'POST',
        body: payload,
    });
}

export async function PATCH(request: Request) {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get("auth_id");

    if (!authId) {
        return Response.json({ error: "Missing auth_id" }, { status: 400 });
    }

    const payload = await request.json();

    return proxyBackend(`/api/students/${authId}`, {
        method: 'PATCH',
        body: payload,
    });
}
