import { fetchBackendPayload, proxyBackend } from '../_lib/backendProxy';

export async function POST(request: Request) {
    const payload = await request.json();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const courseCode = searchParams.get("course_code");

    if (!studentId || !courseCode) {
        return Response.json({ error: "Missing student_id or course_code" }, { status: 400 });
    }

    return proxyBackend(`/api/assignments/${studentId}/${courseCode}/create_assignment`, {
        method: 'POST',
        body: payload,
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const courseCode = searchParams.get("course_code");

    if (!studentId || !courseCode) {
        return Response.json({ error: "Missing student_id or course_code" }, { status: 400 });
    }

    // Get the assignments for the student and course

    const { response: assignmentsResponse, payload } = await fetchBackendPayload(
        `/api/assignments/${studentId}/${courseCode}/assignments`
    );

    if (!payload || typeof payload !== 'object') {
        return Response.json(payload, { status: assignmentsResponse.status });
    }

    const payloadRecord = payload as { assignments?: unknown[] };
    const assignmentsList = Array.isArray(payloadRecord.assignments) ? payloadRecord.assignments : [];

    // Get the tasks for each assignment
    const tasksPromises = assignmentsList.map(async (assignment) => {
        const assignmentRecord = assignment as Record<string, unknown>;
        const assignmentId = String(assignmentRecord.id ?? '');

        const { payload: tasksPayload } = await fetchBackendPayload(
            `/api/assignments/${studentId}/${courseCode}/${assignmentId}`
        );

        const tasks =
            tasksPayload && typeof tasksPayload === 'object' && 'tasks' in tasksPayload
                ? (tasksPayload as { tasks?: unknown }).tasks
                : [];

        return { ...assignmentRecord, tasks };
    });

    const assignmentsWithTasks = await Promise.all(tasksPromises);
    payloadRecord.assignments = assignmentsWithTasks;

    return Response.json(payloadRecord, { status: assignmentsResponse.status });
}

export async function PATCH(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const courseCode = searchParams.get("course_code");
    const assignmentId = searchParams.get("assignment_id");
    const taskId = searchParams.get("task_id");

    if (!studentId || !courseCode || !assignmentId || !taskId) {
        return Response.json(
            { error: "Missing student_id, course_code, assignment_id, or task_id" },
            { status: 400 }
        );
    }

    return proxyBackend(
        `/api/assignments/${studentId}/${courseCode}/${assignmentId}/complete_task/${taskId}`,
        {
            method: 'PATCH',
        }
    );
}
