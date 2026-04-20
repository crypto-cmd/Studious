"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, BarChart2, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import SectionHeader from '@components/SectionHeader';
import AnalyticsTrajectoryChart from '@components/AnalyticsTrajectoryChart';
import { useSessionStore } from '@lib/sessionStore';
import { useCourses, type Course } from '@hooks/useCourses';
import { useCourseImprovement, type CourseImprovement, type ImprovementMetric } from '@hooks/useCourseImprovement';

type InsightCard = {
    id: string;
    eyebrow: string;
    headline: string;
    body: string;
    icon: ReactNode;
    tone: 'accent' | 'neutral' | 'warning';
    suggestions?: Array<{
        label: string;
        deltaText: string;
        direction: 'increase' | 'decrease';
    }>;
};

function formatSignedDelta(value: number) {
    const rounded = value.toFixed(1);
    return value > 0 ? `+${rounded}%` : `${rounded}%`;
}

function formatMetricDelta(metric: ImprovementMetric) {
    const signedValue = `${metric.delta > 0 ? '+' : ''}${metric.delta.toFixed(1)}`;

    if (metric.key === 'attendance_percentage') {
        return `${signedValue}%`;
    }

    if (metric.key === 'sleep_hours') {
        return `${signedValue} hrs/night`;
    }

    if (metric.key === 'exercise_frequency') {
        return `${signedValue} sessions/week`;
    }

    if (metric.key === 'mental_health_rating') {
        return `${signedValue} points`;
    }

    return `${signedValue} hrs/day`;
}

function buildInsightCards(
    course: Course | null,
    improvementData: CourseImprovement | null
): InsightCard[] {
    if (!course) {
        return [
            {
                id: 'empty',
                eyebrow: 'Select a course',
                headline: 'No analytics data yet',
                body: 'Choose one of your tracked courses to view its prediction history and exam timing.',
                icon: <AlertCircle className="w-5 h-5 text-cyan-400" />,
                tone: 'neutral',
            },
        ];
    }

    if (!improvementData) {
        return [
            {
                id: 'waiting',
                eyebrow: 'Smart nudges',
                headline: 'No improvement profile available yet',
                body: 'The backend has not returned course-specific improvement suggestions for this course.',
                icon: <AlertCircle className="w-5 h-5 text-cyan-400" />,
                tone: 'neutral',
            },
            {
                id: 'exam',
                eyebrow: 'Exam timing',
                headline: course.countdown,
                body: course.examDate,
                icon: <Calendar className="w-5 h-5 text-cyan-400" />,
                tone: course.countdown === 'Past due' ? 'warning' : 'neutral',
            },
        ];
    }

    const baselineHeadline = improvementData.currentGrade != null
        ? `Current baseline: ${improvementData.currentGrade.toFixed(1)}%`
        : 'Current baseline unavailable';

    const finalGradeEstimate = course.finalPredictedGrade != null
        ? `${course.finalPredictedGrade.toFixed(1)}%`
        : improvementData.predictedImprovedGrade != null
            ? `${improvementData.predictedImprovedGrade.toFixed(1)}%`
            : null;

    const suggestionMetrics = improvementData.metrics.filter((metric) => metric.delta !== 0);
    const suggestionRows = suggestionMetrics.map((metric) => ({
        label: metric.label,
        deltaText: formatMetricDelta(metric),
        direction: metric.delta >= 0 ? 'increase' as const : 'decrease' as const,
    }));

    const predictedImprovementText = improvementData.predictedImprovedGrade != null
        ? `Projected result: ${improvementData.predictedImprovedGrade.toFixed(1)}% (${formatSignedDelta(improvementData.gradeImprovement)}).`
        : `Projected uplift: ${formatSignedDelta(improvementData.gradeImprovement)}.`;

    const hasNegativeSuggestion = suggestionMetrics.some((metric) => metric.delta < 0);

    return [
        {
            id: 'trend',
            eyebrow: 'Current profile',
            headline: baselineHeadline,
            body: finalGradeEstimate
                ? `Estimated final grade: ${finalGradeEstimate}.`
                : 'Baseline comes directly from your current profile in the improvement model.',
            icon: <TrendingUp className="w-5 h-5 text-cyan-400" />,
            tone: 'neutral',
        },
        {
            id: 'projection',
            eyebrow: 'Exam timing',
            headline: course.countdown,
            body: course.examDate,
            icon: <Calendar className="w-5 h-5 text-cyan-400" />,
            tone: course.countdown === 'Past due' ? 'warning' : 'neutral',
        },
        {
            id: 'caution',
            eyebrow: 'Suggested adjustment',
            headline: 'Projected result with recommended changes',
            body: suggestionRows.length > 0
                ? predictedImprovementText
                : `${predictedImprovementText} No habit adjustments were returned by the backend optimizer.`,
            icon: <AlertCircle className="w-5 h-5 text-cyan-400" />,
            tone: hasNegativeSuggestion ? 'warning' : 'neutral',
            suggestions: suggestionRows,
        },
    ];
}

function buildInsightClassName(tone: InsightCard['tone']) {
    if (tone === 'accent') {
        return 'bg-gradient-to-r from-[#132e2a] to-[#0a1816] border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]';
    }

    if (tone === 'warning') {
        return 'bg-[#132e2a] border border-red-500/30';
    }

    return 'bg-[#132e2a] border border-[#1b3f3a]';
}

export default function AnalyticsDashboard({ selectedCourseCode: initialCourseCode = "" }: { selectedCourseCode?: string }) {
    const studentId = useSessionStore((snapshot) => snapshot.studentId);
    const { courses, isLoading, error } = useCourses(studentId);
    const [selectedCourseCode, setSelectedCourseCode] = useState(initialCourseCode);
    const selectedCourse = useMemo(() => {
        if (!courses.length) {
            return null;
        }

        return courses.find((course) => course.code === selectedCourseCode) ?? courses[0] ?? null;
    }, [courses, selectedCourseCode]);

    const {
        data: improvementData,
        isLoading: isLoadingImprovement,
        error: improvementError,
    } = useCourseImprovement(studentId, selectedCourse?.code ?? '');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (courses.length === 0) {
            setSelectedCourseCode('');
            return;
        }

        setSelectedCourseCode((current) => {
            // If current selection is still valid, keep it
            if (current && courses.some((course) => course.code === current)) {
                return current;
            }

            // Default to first course
            return courses[0]?.code ?? '';
        });
    }, [courses.length]);

    const insightCards = useMemo(
        () => buildInsightCards(selectedCourse, improvementData),
        [selectedCourse, improvementData]
    );

    return (
        <div className="bg-[#091f1c] min-h-screen text-white font-sans selection:bg-cyan-500 selection:text-white pb-24 flex justify-center">
            <div className="w-full max-w-md px-4 pt-6">
                <header className="mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        <BarChart2 className="text-cyan-400 w-8 h-8" />
                        Prediction Engine
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">See your course predictions and exam timing</p>
                </header>

                <section className="mb-6">
                    <label className="block text-xs font-medium text-gray-400 mb-1 px-2">Selected Course</label>

                    {error && <p className="text-sm text-red-300 px-2 mb-3">{error}</p>}

                    {isLoading && courses.length === 0 && (
                        <p className="text-sm text-gray-400 px-2 mb-3">Loading courses...</p>
                    )}

                    {!isLoading && courses.length === 0 && !error && (
                        <p className="text-sm text-gray-400 px-2 mb-3">No course records found yet.</p>
                    )}

                    {courses.length > 0 && (
                        <div className="px-2">
                            <select
                                value={selectedCourse?.code ?? ''}
                                onChange={(event) => setSelectedCourseCode(event.target.value)}
                                className="w-full bg-[#132e2a] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm"
                            >
                                {courses.map((course) => (
                                    <option key={course.code} value={course.code}>
                                        {course.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </section>

                <AnalyticsTrajectoryChart course={selectedCourse} />

                <section className="mb-6">
                    <SectionHeader title="Smart Nudges" icon={<Sparkles className="w-5 h-5 text-cyan-400" />} />
                    {isLoadingImprovement && (
                        <p className="text-sm text-gray-400 px-2 mb-3">Loading smart nudges...</p>
                    )}
                    {improvementError && (
                        <p className="text-sm text-red-300 px-2 mb-3">{improvementError}</p>
                    )}
                    <div className="flex flex-col gap-3">
                        {insightCards.map((card) => (
                            <div key={card.id} className={`rounded-2xl p-4 ${buildInsightClassName(card.tone)}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-xl mt-1 ${card.tone === 'warning' ? 'bg-red-500/10' : 'bg-cyan-500/20'}`}>
                                        {card.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-300">{card.eyebrow}</p>
                                        <p className={`text-lg font-bold mt-1 ${card.tone === 'warning' ? 'text-red-400' : 'text-cyan-400'}`}>
                                            {card.headline}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">{card.body}</p>
                                        {card.suggestions && card.suggestions.length > 0 && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {card.suggestions.map((suggestion) => (
                                                    <div
                                                        key={`${card.id}-${suggestion.label}`}
                                                        className="flex items-center justify-between rounded-lg border border-[#1b3f3a] bg-[#0a1816] px-3 py-2"
                                                    >
                                                        <p className="text-xs text-gray-300">{suggestion.label}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[11px] uppercase tracking-wide ${suggestion.direction === 'decrease' ? 'text-red-300' : 'text-cyan-300'}`}>
                                                                {suggestion.direction}
                                                            </span>
                                                            <span className={`text-xs font-semibold ${suggestion.direction === 'decrease' ? 'text-red-300' : 'text-cyan-300'}`}>
                                                                {suggestion.deltaText}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}
