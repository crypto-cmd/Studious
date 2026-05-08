from computations.KernelDensityEstimation import KernelDensityEstimation
from data.db import db
import math

def format_peak_windows(peaks) -> str:
    """
    Takes the output from KernelDensityEstimation.get_peak_windows and 
    returns a human-readable summary of a student's focus habits.
    """
    if not peaks:
        return "Not enough data to determine peak focus windows. Keep logging sessions!"

    # Sort peaks by density (strength) descending so the most prominent is first
    sorted_peaks = sorted(peaks, key=lambda x: x['peak_density'], reverse=True)
    
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    two_pi = 2.0 * math.pi
    seconds_in_week = 604800.0

    def theta_to_string(theta: float) -> str:
        """Helper to convert [0, 2PI) into 'Day at HH:MM AM/PM'"""
        # Ensure theta is strictly within [0, 2PI)
        theta = theta % two_pi
        
        # Convert theta to total seconds into the week
        total_seconds = (theta / two_pi) * seconds_in_week
        
        day_index = int(total_seconds // 86400)
        day_name = days_of_week[day_index]
        
        remaining_seconds = total_seconds % 86400
        hours_24 = int(remaining_seconds // 3600)
        minutes = int((remaining_seconds % 3600) // 60)
        
        # Convert to 12-hour format
        am_pm = "AM" if hours_24 < 12 else "PM"
        hours_12 = hours_24 % 12
        if hours_12 == 0:
            hours_12 = 12
            
        return f"{day_name} at {hours_12}:{minutes:02d} {am_pm}"

    def describe_strength(density: float) -> str:
        """Helper to convert the [0, 1] density score into a qualitative label"""
        if density >= 0.8: return "Very Strong"
        if density >= 0.5: return "Moderate"
        return "Mild"

    lines = ["Here are your optimal focus windows, ranked by strength:\n"]

    for i, peak in enumerate(sorted_peaks, 1):
        peak_time = theta_to_string(peak['peak_theta'])
        start_time = theta_to_string(peak['ci_low'])
        end_time = theta_to_string(peak['ci_high'])
        strength_label = describe_strength(peak['peak_density'])
        
        lines.append(f"#{i} - {peak_time}")
        lines.append(f"    • Focus Window: {start_time} to {end_time}")
        lines.append(f"    • Consistency: {strength_label} (Score: {peak['peak_density']:.2f})")
        lines.append("") # blank line for spacing

    return "\n".join(lines).strip()

def run_kde_for_student(student_id: int):
    print(f"Running KDE for student {student_id}...")
    kde = KernelDensityEstimation(bandwidth=0.03, grid_resolution=720)
    sessions = db.table("focus_sessions").select("*").eq("student_id", student_id).execute().data
    kde.fit(sessions)
    peak_windows =  kde.get_peak_windows(prominence_threshold=0.1)
    return peak_windows

