import { proxyBackend } from '../../../_lib/backendProxy';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ assignmentId: string }> }
) {
    const { assignmentId } = await params;

    if (!assignmentId) {
        return Response.json({ error: 'Missing assignmentId' }, { status: 400 });
    }

    return proxyBackend(`/api/assignments/${assignmentId}/schedule`, {
        method: 'POST',
    });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ assignmentId: string }> }
) {
    const { assignmentId } = await params;

    if (!assignmentId) {
        return Response.json({ error: 'Missing assignmentId' }, { status: 400 });
    }

    return proxyBackend(`/api/assignments/${assignmentId}/schedule`, {
        method: 'DELETE',
    });
}
