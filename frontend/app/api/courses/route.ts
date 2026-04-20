import { proxyBackend } from '../_lib/backendProxy';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    return proxyBackend(`/api/students/${studentId}/courses`);
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
        return Response.json({ error: 'Missing student_id' }, { status: 400 });
    }

    const payload = await request.json();

    return proxyBackend(`/api/students/${studentId}/courses`, {
        method: 'POST',
        body: payload,
    });
}

export async function PATCH(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const courseCode = searchParams.get('course_code');

    if (!studentId || !courseCode) {
        return Response.json({ error: 'Missing student_id or course_code' }, { status: 400 });
    }

    const payload = await request.json();

    return proxyBackend(`/api/students/${studentId}/courses/${encodeURIComponent(courseCode)}`, {
        method: 'PATCH',
        body: payload,
    });
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const courseCode = searchParams.get('course_code');

    if (!studentId || !courseCode) {
        return Response.json({ error: 'Missing student_id or course_code' }, { status: 400 });
    }

    return proxyBackend(`/api/students/${studentId}/courses/${encodeURIComponent(courseCode)}`, {
        method: 'DELETE',
    });
}
