import React from "react";

type AppShellProps = {
    children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
    return (
        <div className="bg-[#091f1c] min-h-screen text-white selection:bg-cyan-500 selection:text-white pb-24 flex justify-center">
            <div className="w-full max-w-md px-4 pt-6">{children}</div>
        </div>
    );
}
