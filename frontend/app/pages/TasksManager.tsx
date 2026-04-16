"use client";
import { useState } from 'react';
import { ListTodo, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import XpBanner from '../components/XpBanner';

// --- Types ---
type MicroTask = {
  id: string;
  description: string;
  xp: number;
  completed: boolean;
};

// --- Mock Data ---
const initialTasks: MicroTask[] = [
  { id: '1', description: 'Read Chapter 4 and take notes on the economic impact.', xp: 10, completed: true },
  { id: '2', description: 'Read Chapter 5 and take notes on land ownership patterns.', xp: 10, completed: true },
  { id: '3', description: 'Summarize the key content among Chapters 4 to 5.', xp: 15, completed: false },
  { id: '4', description: 'Write three body paragraphs for each point in your summary.', xp: 20, completed: false },
];

export default function TaskManager() {
  const [tasks, setTasks] = useState<MicroTask[]>(initialTasks);
  const [assignment, setAssignment] = useState('');
  const [course, setCourse] = useState('');
  const [dueDate, setDueDate] = useState('');

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <>

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <ListTodo className="text-cyan-400 w-8 h-8" />
          Task Manager
        </h1>
        <p className="text-gray-400 text-sm mt-1">Break down overwhelming assignments.</p>
      </header>

      <XpBanner level={5} xp={67} completed={completedCount} total={tasks.length} />

      <section className="bg-[#132e2a] rounded-3xl p-5 mb-6 border border-[#1b3f3a] shadow-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Paste Assignment</label>
          <textarea
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            placeholder="Example: 'Write a report on the current effects of slavery in Jamaica, making reference to textbook Chapters 3 - 5'"
            className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm min-h-[100px] resize-none"
          />
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Linked Course</label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. COMP3901"
              className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm [color-scheme:dark]"
            />
          </div>
        </div>

        <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#091f1c] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Sparkles className="w-5 h-5" />
          Break It Down 🧩
        </button>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 px-2">Micro-Tasks</h2>
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`bg-[#132e2a] rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-3 ${task.completed
                  ? 'border-[#1b3f3a]/50 opacity-60'
                  : 'border-[#1b3f3a] hover:border-cyan-400/50'
                }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {task.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-500" />
                )}
              </div>

              <div className="flex-1">
                <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                  {task.description}
                </p>
              </div>

              <div className="flex-shrink-0 bg-[#091f1c] px-2 py-1 rounded-md border border-[#1b3f3a]">
                <span className="text-xs text-cyan-400 font-bold">+{task.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}