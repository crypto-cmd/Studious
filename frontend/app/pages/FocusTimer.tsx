import { useEffect, useState } from 'react';
import { Hourglass, Play, Pause, Square, Clock } from 'lucide-react';
import XpBanner from '@components/XpBanner';
import { useSessionStore } from '@lib/sessionStore';
import { useTaskSummary } from '@hooks/useTaskSummary';

import { useFocusSessions } from '@hooks/useFocusSessions';
import FocusSessionCard from '@components/FocusSessionCard';
import FocusSummaryCard from '@components/FocusSummaryCard';
import SectionHeader from '@components/SectionHeader';

const FOCUS_RATINGS = [
  { score: 1, emoji: '😫', label: 'Very low focus' },
  { score: 2, emoji: '🙁', label: 'Low focus' },
  { score: 3, emoji: '😐', label: 'Okay focus' },
  { score: 4, emoji: '🙂', label: 'Good focus' },
  { score: 5, emoji: '🤩', label: 'Great focus' },
] as const;

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function FocusTimer() {
  const studentId = useSessionStore((snapshot) => snapshot.studentId);
  const { completedCount, totalCount, totalXp, level } = useTaskSummary(studentId);
  const { recentSessions, totalFocusHours, isLoading, isSaving, error, saveSession } = useFocusSessions(studentId);
  const [isActive, setIsActive] = useState(false);
  const [pendingSessionSeconds, setPendingSessionSeconds] = useState<number | null>(null);

  // Timer state (in seconds) - stopwatch mode starts at zero
  const [time, setTime] = useState(0);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isActive) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);

  const stopTimer = async () => {
    if (isSaving) {
      return;
    }

    const elapsedSeconds = time;

    setIsActive(false);
    setTime(0);

    if (studentId == null || elapsedSeconds <= 0) {
      return;
    }

    setPendingSessionSeconds(elapsedSeconds);
  };

  const submitFocusRating = async (focusScore: number) => {
    if (studentId == null || pendingSessionSeconds == null || isSaving) {
      return;
    }

    try {
      await saveSession(pendingSessionSeconds, focusScore);
      setPendingSessionSeconds(null);
    } catch (error: unknown) {
      // The hook keeps the latest error state; this is a local guard only.
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTime(0);
  };

  return (
    <>

      {/* --- Header --- */}
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Hourglass className="text-cyan-400 w-8 h-8" />
          Focus Engine
        </h1>
        <p className="text-gray-400 text-sm mt-1">Finding your natural productivity peaks.</p>
      </header>

      <XpBanner level={level} xp={totalXp} completed={completedCount} total={totalCount} />

      {/* --- Active Timer (KDE Engine View) --- */}
      <section className="flex flex-col items-center justify-center py-8 mb-4">
        {/* Calming Blob Shape */}
        <div className="relative flex items-center justify-center mb-10 w-64 h-64">
          <div
            className={`absolute inset-0 bg-[#132e2a] border-4 transition-all duration-1000 ease-in-out shadow-2xl ${isActive ? 'border-cyan-400 scale-105 shadow-cyan-500/20' : 'border-[#1b3f3a]'}`}
            style={{
              // Custom CSS border-radius to create an organic, abstract blob shape
              borderRadius: isActive ? '50% 50% 50% 50% / 50% 50% 50% 50%' : '60% 40% 30% 70% / 60% 30% 70% 40%',
            }}
          ></div>
          <span className={`relative text-6xl font-black tracking-tighter tabular-nums transition-colors ${isActive ? 'text-cyan-400' : 'text-white'}`}>
            {formatTime(time)}
          </span>
        </div>

        {/* High-Contrast Controls */}
        <div className="flex gap-4">
          <button
            onClick={toggleTimer}
            className={`flex items-center justify-center w-16 h-16 rounded-full transition-all shadow-lg ${isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-cyan-400 text-[#091f1c] hover:bg-cyan-300 hover:scale-105'}`}
          >
            {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <button
            onClick={stopTimer}
            disabled={(time === 0 && !isActive) || isSaving}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[#132e2a] text-gray-400 border border-[#1b3f3a] hover:text-white hover:bg-[#1b3f3a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-6 h-6 fill-current" />
          </button>
        </div>

        <button
          type="button"
          onClick={resetTimer}
          className="mt-4 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Reset without saving
        </button>
      </section>

      {pendingSessionSeconds != null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#1b3f3a] bg-[#132e2a] p-5 shadow-2xl shadow-black/40">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Rate this session</h2>
              <p className="mt-1 text-sm text-gray-400">How focused did this session feel?</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {FOCUS_RATINGS.map((rating) => (
                <button
                  key={rating.score}
                  type="button"
                  onClick={() => void submitFocusRating(rating.score)}
                  disabled={isSaving}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#1b3f3a] bg-[#091f1c] px-2 py-3 text-center transition-transform hover:-translate-y-0.5 hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="text-2xl">{rating.emoji}</span>
                  <span className="text-[10px] leading-tight text-gray-300">{rating.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPendingSessionSeconds(null)}
                className="rounded-xl border border-[#1b3f3a] px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-cyan-400 hover:text-white"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Recent Sessions Log --- */}
      <section className="mb-6">
        <SectionHeader title="Recent Sessions" icon={<Clock className="w-5 h-5 text-gray-400" />} />
        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-red-300 px-2">{error}</p>}

          {isLoading && (
            <p className="text-sm text-gray-400 px-2">Loading sessions...</p>
          )}

          {!isLoading && recentSessions.length === 0 && (
            <p className="text-sm text-gray-400 px-2">No focus sessions yet.</p>
          )}

          {recentSessions.map((session) => <FocusSessionCard key={session.id} session={session} />)}
        </div>
      </section>

      {/* --- Activity Metric Summary --- */}
      <FocusSummaryCard totalFocusHours={totalFocusHours} />

    </>
  );
}