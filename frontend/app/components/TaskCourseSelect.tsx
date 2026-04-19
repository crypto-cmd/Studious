type TaskCourseSelectProps = {
    courses: string[];
    selectedCourse: string;
    onSelectedCourseChange: (course: string) => void;
    isLoading: boolean;
};

export default function TaskCourseSelect({
    courses,
    selectedCourse,
    onSelectedCourseChange,
    isLoading,
}: TaskCourseSelectProps) {
    return (
        <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">Select Course</label>
            <select
                value={selectedCourse}
                onChange={(event) => onSelectedCourseChange(event.target.value)}
                className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm"
                disabled={isLoading || courses.length === 0}
            >
                {courses.length === 0 ? (
                    <option value="">No courses available</option>
                ) : (
                    courses.map((courseCode) => (
                        <option key={courseCode} value={courseCode}>
                            {courseCode}
                        </option>
                    ))
                )}
            </select>
        </div>
    );
}
