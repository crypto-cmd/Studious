import { proxyBackend } from '../_lib/backendProxy';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    return proxyBackend(`/api/focus-sessions/${encodeURIComponent(studentId)}`);
}

export async function POST(request: Request) {
    const payload = await request.json();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    return proxyBackend(`/api/focus-sessions/${encodeURIComponent(studentId)}`, {
        method: 'POST',
        body: payload,
    });
}
