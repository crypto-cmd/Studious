export async function POST(request: Request) {
    const payload = await request.json();
    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const courseCode = searchParams.get("course_code");

    if (!studentId || !courseCode) {
        return Response.json({ error: "Missing student_id or course_code" }, { status: 400 });
    }

    const response = await fetch(`${backendUrl}/api/assignments/${studentId}/${courseCode}/create_assignment`, {
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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const courseCode = searchParams.get("course_code");

    if (!studentId || !courseCode) {
        return Response.json({ error: "Missing student_id or course_code" }, { status: 400 });
    }

    // Get the assignments for the student and course

    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
    const assignmentsResponse = await fetch(`${backendUrl}/api/assignments/${studentId}/${courseCode}/assignments`, {
        cache: "no-store",
    });

    const payload = await assignmentsResponse.json();

    // Get the tasks for each assignment
    const tasksPromises = payload.assignments.map(async (assignment: any) => {
        const tasksResponse = await fetch(`${backendUrl}/api/assignments/${studentId}/${courseCode}/${assignment.id}`, {
            cache: "no-store",
        });
        const tasksPayload = await tasksResponse.json();
        return { ...assignment, tasks: tasksPayload.tasks };
    });

    const assignmentsWithTasks = await Promise.all(tasksPromises);
    payload.assignments = assignmentsWithTasks;

    return Response.json(payload, { status: assignmentsResponse.status });
}
