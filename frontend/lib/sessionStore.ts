"use client";

import { useSyncExternalStore } from "react";

type SessionState = {
    authId: string | null;
    studentId: string | number | null;
};

let state: SessionState = {
    authId: null,
    studentId: null,
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function emitChange() {
    listeners.forEach((listener) => listener());
}

function setState(next: Partial<SessionState>) {
    state = { ...state, ...next };
    emitChange();
}

export function useSessionStore<T>(selector: (snapshot: SessionState) => T): T {
    return useSyncExternalStore(
        subscribe,
        () => selector(state),
        () => selector(state)
    );
}

export const sessionStoreActions = {
    setAuthId(authId: string | null) {
        setState({ authId });
    },
    setStudentId(studentId: string | number | null) {
        setState({ studentId });
    },
    clear() {
        setState({ authId: null, studentId: null });
    },
};
