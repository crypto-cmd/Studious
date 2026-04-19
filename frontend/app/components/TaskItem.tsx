import { CheckCircle2, Circle } from "lucide-react";

type TaskItemProps = {
    task: {
        id: string;
        description: string;
        xp: number;
        completed: boolean;
    };
    isCompleting: boolean;
    onClick: () => void;
};

export default function TaskItem({ task, isCompleting, onClick }: TaskItemProps) {
    return (
        <div
            onClick={onClick}
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
                {isCompleting && (
                    <p className="text-xs text-cyan-300 mt-2 animate-pulse">Saving...</p>
                )}
            </div>

            <div className="flex-shrink-0 bg-[#091f1c] px-2 py-1 rounded-md border border-[#1b3f3a]">
                <span className="text-xs text-cyan-400 font-bold">+{task.xp} XP</span>
            </div>
        </div>
    );
}
