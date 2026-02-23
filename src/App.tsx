import React, { useState } from "react";
import { CalendarDays, Target } from "lucide-react";
import { AppProvider } from "./store/useStore";
import { MainLayout } from "./components/MainLayout";
import { LongTermPanel } from "./components/LongTermPanel";
import clsx from "clsx";

type View = "main" | "longterm";

function AppContent() {
  const [currentView, setCurrentView] = useState<View>("main");

  return (
    <div className="flex h-screen flex-col bg-gray-100 overflow-hidden font-sans">
      {/* Header / Navigation */}
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">FocusFlow</h1>
        </div>

        <nav className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setCurrentView("main")}
            className={clsx(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
              currentView === "main"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Daily & Weekly
          </button>
          <button
            onClick={() => setCurrentView("longterm")}
            className={clsx(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
              currentView === "longterm"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            )}
          >
            <Target className="h-4 w-4" />
            Long-Term Goals
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {currentView === "main" ? <MainLayout /> : <LongTermPanel />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
