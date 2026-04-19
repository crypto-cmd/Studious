import { proxyBackend } from '../_lib/backendProxy';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const courseCode = searchParams.get('course_code');

    if (!studentId || !courseCode) {
        return Response.json({ error: 'Missing student_id or course_code' }, { status: 400 });
    }

    return proxyBackend(
        `/api/improvement/${encodeURIComponent(studentId)}/${encodeURIComponent(courseCode)}/improve`
    );
}
