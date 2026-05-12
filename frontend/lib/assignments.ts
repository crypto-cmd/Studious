export type AssignmentTask = {
    id: string;
    description: string;
    completed: boolean;
};

export type Assignment = {
    id: string;
    title?: string;
    instructions?: string;
    dueDate: string | null;
    courseCode: string;
    scheduleStatus: string;
    scheduledAt: string | null;
    calendarEventIds: string[];
    isScheduled: boolean;
    tasks: AssignmentTask[];
};

function formatDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parseCalendarDate(value: string): Date | null {
    const trimmedValue = value.trim();
    const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]);
        const day = Number(dateOnlyMatch[3]);
        return new Date(year, month - 1, day);
    }

    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate;
}

export function normalizeDueDate(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    const dateOnlyMatch = trimmedValue.match(/\d{4}-\d{2}-\d{2}/);
    if (dateOnlyMatch) {
        return dateOnlyMatch[0];
    }

    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return trimmedValue;
    }

    return formatDateKey(parsedDate);
}

export function normalizeAssignmentDueDate(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    return normalizeDueDate(value);
}

export function normalizeAssignments(payload: unknown): Assignment[] {
    const asRecord = payload as Record<string, unknown>;
    const assignmentsRaw = asRecord?.assignments;

    if (!Array.isArray(assignmentsRaw)) {
        return [];
    }

    return assignmentsRaw.map((assignmentRaw, index) => {
        const assignmentRecord = assignmentRaw as Record<string, unknown>;
        const tasksRaw = assignmentRecord.tasks;
        const scheduleStatus = typeof assignmentRecord.schedule_status === 'string'
            ? assignmentRecord.schedule_status
            : typeof assignmentRecord.scheduleStatus === 'string'
                ? assignmentRecord.scheduleStatus
                : '';
        const scheduledAt = typeof assignmentRecord.scheduled_at === 'string'
            ? assignmentRecord.scheduled_at
            : typeof assignmentRecord.scheduledAt === 'string'
                ? assignmentRecord.scheduledAt
                : null;
        const calendarEventIdsRaw = assignmentRecord.calendar_event_ids;
        const calendarEventIds = Array.isArray(calendarEventIdsRaw)
            ? calendarEventIdsRaw
                .map((item) => {
                    if (typeof item === 'string') {
                        return item.trim();
                    }

                    if (item && typeof item === 'object') {
                        const record = item as Record<string, unknown>;
                        const eventId = record.event_id ?? record.eventId ?? record.id;
                        return typeof eventId === 'string' ? eventId.trim() : '';
                    }

                    return '';
                })
                .filter((value): value is string => value.length > 0)
            : [];

        const isScheduled = scheduleStatus === 'scheduled' || Boolean(scheduledAt) || calendarEventIds.length > 0;

        const tasks = Array.isArray(tasksRaw)
            ? tasksRaw.map((taskRaw, taskIndex) => {
                const taskRecord = taskRaw as Record<string, unknown>;
                return {
                    id: typeof taskRecord.id === 'string'
                        ? taskRecord.id
                        : `${String(assignmentRecord.id ?? index)}-${taskIndex}`,
                    description: typeof taskRecord.task === 'string' ? taskRecord.task : 'Untitled task',
                    completed: Boolean(taskRecord.completed),
                };
            })
            : [];

        return {
            id: String(assignmentRecord.id ?? index),
            title: typeof assignmentRecord.title === 'string' ? assignmentRecord.title : '',
            instructions: typeof assignmentRecord.instructions === 'string' ? assignmentRecord.instructions : '',
            dueDate: normalizeAssignmentDueDate(assignmentRecord.due_date as string | null | undefined),
            courseCode: typeof assignmentRecord.course_code === 'string'
                ? assignmentRecord.course_code
                : typeof assignmentRecord.courseCode === 'string'
                    ? assignmentRecord.courseCode
                    : '',
            scheduleStatus: scheduleStatus || (isScheduled ? 'scheduled' : 'unscheduled'),
            scheduledAt,
            calendarEventIds,
            isScheduled,
            tasks,
        };
    });
}

export function formatDueDateLabel(value: string | null | undefined) {
    const normalizedValue = normalizeAssignmentDueDate(value);

    if (!normalizedValue) {
        return 'No due date';
    }

    const parsedDate = parseCalendarDate(normalizedValue);
    if (!parsedDate) {
        return normalizedValue;
    }

    return parsedDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}
