type XpBannerProps = {
    level: number;
    xp: number;
    completed: number;
    total: number;
};

export default function XpBanner({ level, xp, completed, total }: XpBannerProps) {
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
        <section className="bg-[#132e2a] rounded-3xl p-5 mb-6 shadow-lg border border-[#1b3f3a]">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">Level {level}</span>
                </div>
                <span className="text-sm font-semibold text-gray-300">{xp} XP</span>
            </div>

            <div className="w-full bg-[#0a1816] rounded-full h-3 mb-2 overflow-hidden">
                <div
                    className="bg-cyan-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-xs text-gray-400 font-medium">
                {completed} / {total} tasks completed
            </p>
        </section>
    );
}
