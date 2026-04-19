export default function Loading() {
    return (
        <div className="relative h-16 w-16">
            <span className="absolute left-0 top-0 h-5 w-5 rounded-md bg-cyan-300 animate-[loading-grid_1.4s_ease-in-out_infinite]" />
            <span
                className="absolute right-0 top-0 h-5 w-5 rounded-md bg-cyan-400 animate-[loading-grid_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: '0.12s' }}
            />
            <span
                className="absolute left-0 bottom-0 h-5 w-5 rounded-md bg-cyan-400 animate-[loading-grid_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: '0.24s' }}
            />
            <span
                className="absolute right-0 bottom-0 h-5 w-5 rounded-md bg-cyan-300 animate-[loading-grid_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: '0.36s' }}
            />
        </div>
    );
}