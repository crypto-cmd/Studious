"use client";

import { useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import BottomNav, { TabId } from "./components/BottomNav";
import ComingSoon from "./components/ComingSoon";
import HomeDashboard from "./pages/HomeDashboard";
import TaskManager from "./pages/TasksManager";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "home":
        return <HomeDashboard />;
      case "tasks":
        return <TaskManager />;
      case "timer":
        return (
          <ComingSoon
            title="Study Timer"
            description="Focus sessions and break tracking will appear here."
          />
        );
      case "analytics":
        return (
          <ComingSoon
            title="Analytics"
            description="Performance trends and predictions will appear here."
          />
        );
      case "calendar":
        return (
          <ComingSoon
            title="Calendar"
            description="Your schedule and deadlines will appear here."
          />
        );
      default:
        return <HomeDashboard />;
    }
  }, [activeTab]);

  return (
    <AppShell>
      {activeContent}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </AppShell>
  );
}
