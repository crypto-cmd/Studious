"use client";

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
    Chart as ChartJS,
    type ChartDataset,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Course } from '@hooks/useCourses';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

type AnalyticsTrajectoryChartProps = {
    course: Course | null;
};

type TrajectoryPoint = {
    label: string;
    value: number;
};

function formatMonthLabel(month: number) {
    const monthIndex = Math.min(12, Math.max(1, month)) - 1;
    return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(2026, monthIndex, 1));
}

function buildTrajectoryPoints(course: Course | null): TrajectoryPoint[] {
    if (!course) {
        return [];
    }

    const history = [...course.predictedGrades].sort((left, right) => left.month - right.month);

    if (history.length > 0) {
        return history.map((entry, index) => ({
            label: `${formatMonthLabel(entry.month)} ${index + 1}`,
            value: entry.grade,
        }));
    }

    const fallbackPoints: TrajectoryPoint[] = [];

    if (course.currentPredictedGrade != null) {
        fallbackPoints.push({ label: 'Current', value: course.currentPredictedGrade });
    }

    if (course.finalPredictedGrade != null && course.finalPredictedGrade !== course.currentPredictedGrade) {
        fallbackPoints.push({ label: 'Final', value: course.finalPredictedGrade });
    }

    return fallbackPoints;
}

function buildExpectedFinalLabel(course: Course | null) {
    if (!course) {
        return 'Expected Final';
    }

    const rawDate = course.finalExamDate;
    if (!rawDate) {
        return 'Expected Final';
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return 'Expected Final';
    }

    const shortDate = parsedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });

    return `${shortDate}`;
}

export default function AnalyticsTrajectoryChart({ course }: AnalyticsTrajectoryChartProps) {
    const trajectoryPoints = useMemo(() => buildTrajectoryPoints(course), [course]);
    const expectedFinalGrade = course?.finalPredictedGrade ?? null;
    const hasProjection = expectedFinalGrade != null && trajectoryPoints.length > 0;
    const expectedFinalLabel = useMemo(() => buildExpectedFinalLabel(course), [course]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#132e2a',
                titleColor: '#fff',
                bodyColor: '#22d3ee',
                borderColor: '#1b3f3a',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
            },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                grid: { color: '#1b3f3a', drawBorder: false },
                ticks: { color: '#9ca3af', stepSize: 20 },
            },
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: '#9ca3af' },
            },
        },
    }), []);

    const chartData = useMemo(() => {
        const baseLabels = trajectoryPoints.map((point) => point.label);
        const labels = hasProjection ? [...baseLabels, expectedFinalLabel] : baseLabels;
        const predictedSeries: Array<number | null> = trajectoryPoints.map((point) => point.value);

        if (hasProjection) {
            predictedSeries.push(null);
        }

        const datasets: ChartDataset<'line', Array<number | null>>[] = [
            {
                label: 'Predicted Grade %',
                data: predictedSeries,
                borderColor: '#22d3ee',
                backgroundColor: 'rgba(34, 211, 238, 0.12)',
                borderWidth: 3,
                pointBackgroundColor: '#091f1c',
                pointBorderColor: '#22d3ee',
                pointBorderWidth: 2,
                pointRadius: trajectoryPoints.length > 1 ? 4 : 5,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.35,
            },
        ];

        if (hasProjection && expectedFinalGrade != null) {
            const projectionSeries: Array<number | null> = Array.from({ length: labels.length }, () => null);
            const lastPredictedIndex = trajectoryPoints.length - 1;
            const lastPredictedValue = trajectoryPoints[lastPredictedIndex]?.value ?? null;

            if (lastPredictedValue != null) {
                projectionSeries[lastPredictedIndex] = lastPredictedValue;
                projectionSeries[labels.length - 1] = expectedFinalGrade;
            }

            datasets.push({
                label: 'Expected Final Grade %',
                data: projectionSeries,
                borderColor: '#fbbf24',
                borderWidth: 2,
                borderDash: [6, 6],
                pointRadius: 3,
                pointHoverRadius: 4,
                pointBackgroundColor: '#fbbf24',
                pointBorderColor: '#132e2a',
                pointBorderWidth: 1,
                fill: false,
                tension: 0,
                spanGaps: true,
            });
        }

        return {
            labels,
            datasets,
        };
    }, [expectedFinalGrade, expectedFinalLabel, hasProjection, trajectoryPoints]);

    const latestPoint = trajectoryPoints.at(-1);
    const latestValue = latestPoint?.value ?? null;

    return (
        <section className="bg-[#132e2a] rounded-3xl p-5 mb-6 border border-[#1b3f3a] shadow-lg">
            <div className="flex justify-between items-start mb-4 gap-4">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate">
                        {course ? `${course.code} Trajectory` : 'Course Trajectory'}
                    </h2>
                    <p className="text-xs text-gray-400">
                        {course
                            ? `Based on saved prediction history and the current exam date.`
                            : 'Choose a course to view its predicted grade history.'}
                    </p>
                </div>
                {latestValue != null && (
                    <div className="bg-[#091f1c] px-3 py-1 rounded-full border border-[#1b3f3a] flex items-center gap-1 shrink-0">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-bold text-cyan-400">{latestValue.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {trajectoryPoints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1b3f3a] bg-[#0a1816] px-4 py-10 text-center">
                    <p className="text-sm text-gray-300">No prediction data has been saved for this course yet.</p>
                    <p className="text-xs text-gray-500 mt-2">Run a grade prediction to populate this chart.</p>
                </div>
            ) : (
                <div className="h-48 w-full relative">
                    <Line data={chartData} options={chartOptions} />
                </div>
            )}
        </section>
    );
}
