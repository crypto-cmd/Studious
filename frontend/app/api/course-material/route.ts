export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const courseCode = searchParams.get('course_code');

    if (!studentId || !courseCode) {
        return Response.json({ error: 'Missing student_id or course_code' }, { status: 400 });
    }

    const incomingFormData = await request.formData();
    const file = incomingFormData.get('file');

    if (!(file instanceof File)) {
        return Response.json({ error: 'Missing file upload' }, { status: 400 });
    }

    const isPdfMime = file.type === 'application/pdf';
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');

    if (!isPdfMime && !hasPdfExtension) {
        return Response.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendBaseUrl) {
        return Response.json(
            {
                error: 'Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL and restart the frontend server.',
            },
            { status: 500 }
        );
    }

    const body = new FormData();
    body.append('file', file, file.name);

    const headers = new Headers();
    if (process.env.HF_TOKEN) {
        headers.set('Authorization', `Bearer ${process.env.HF_TOKEN}`);
    }

    const endpoint = `${backendBaseUrl}/api/upload/${encodeURIComponent(String(studentId))}/${encodeURIComponent(courseCode)}/upload_source`;

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            cache: 'no-store',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error while contacting backend';

        return Response.json(
            {
                error: `Backend is unavailable (${message}). Ensure the backend server is running and NEXT_PUBLIC_BACKEND_URL is correct.`,
            },
            { status: 503 }
        );
    }

    const textPayload = await response.text();
    let payload: unknown = null;

    if (textPayload) {
        try {
            payload = JSON.parse(textPayload);
        } catch {
            payload = {
                error: response.ok
                    ? 'Unexpected response from backend'
                    : `Backend error: ${textPayload.substring(0, 200)}`,
            };
        }
    }

    return Response.json(payload, { status: response.status });
}
