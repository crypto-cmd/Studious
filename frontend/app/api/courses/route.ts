import { proxyBackend } from '../_lib/backendProxy';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    return proxyBackend(`/api/students/${studentId}/courses`);
}
