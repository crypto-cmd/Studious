type FocusSummaryCardProps = {
    totalFocusHours: number;
};

export default function FocusSummaryCard({ totalFocusHours }: FocusSummaryCardProps) {
    return (
        <section className="bg-gradient-to-br from-[#132e2a] to-[#0a1816] rounded-3xl p-5 border border-[#1b3f3a] flex items-center gap-4">
            <div className="bg-cyan-500/20 p-3 rounded-2xl">
                <span className="text-cyan-400 text-2xl font-bold">⏱</span>
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Recent Focus</h3>
                <p className="text-2xl font-bold text-white">
                    {totalFocusHours} <span className="text-sm font-normal text-gray-400">hours</span>
                </p>
                <p className="text-xs text-cyan-400 font-bold mt-1">Based on your saved focus sessions.</p>
            </div>
        </section>
    );
}
