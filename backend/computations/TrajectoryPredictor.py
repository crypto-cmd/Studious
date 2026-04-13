

class TrajectoryPredictor:

    def __init__(self, predicted_grade):
        self.predicted_grade = predicted_grade
    
    def calculate_slope(self, predicted_grade):
        n = len(predicted_grade)
        #predicted_grade = [{"grade": 76.5, "month": 1}, {"grade": 80, "month": 2}, {"grade": 85, "month": 3}]
        print(f"Predicted grade data: {predicted_grade}")
        months = [x["month"] for x in predicted_grade]
        grades = [x["grade"] for x in predicted_grade]

        sum_x = sum(months)
        sum_y = sum(grades)
        sum_xy = sum(x*y for x, y in zip(months, grades))
        sum_x_squared = sum(x**2 for x in months)

        print(f"sum_x: {sum_x}, sum_y: {sum_y}, sum_xy: {sum_xy}, sum_x_squared: {sum_x_squared}")
        print(f"months: {months}, grades: {grades}")
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x_squared - sum_x ** 2)
        return slope

    def calculate_intercept(self, predicted_grade, slope):
        n = len(predicted_grade)
        sum_x = sum(x["month"] for x in predicted_grade)
        sum_y = sum(x["grade"] for x in predicted_grade)

        intercept = (sum_y - slope * sum_x) / n
        return intercept
    
    def predict_final_grade(self, final_months):
        slope = self.calculate_slope(self.predicted_grade)
        intercept = self.calculate_intercept(self.predicted_grade, slope)

        predicted_final_grade = slope * final_months + intercept
        clamped_final_grade = max(0, min(100, predicted_final_grade))
        return clamped_final_grade

      
# ================= MAIN =================
if __name__ == "__main__":
    predicted_grade = [(1, 70), (2, 75), (3, 80), (4, 85), (5, 90)]

    trajectory_predictor = TrajectoryPredictor(predicted_grade)

    final_months = 6
    predicted_final_grade = trajectory_predictor.predict_final_grade(final_months)

    print(f"Predicted final grade after {final_months} months: {predicted_final_grade:.2f}")