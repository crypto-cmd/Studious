export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
        return Response.json({ error: "Missing student_id" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
    const response = await fetch(`${backendUrl}/api/assignments/${studentId}/courses`, {
        cache: "no-store",
    });

    const payload = await response.json();
    return Response.json(payload, { status: response.status });
}
