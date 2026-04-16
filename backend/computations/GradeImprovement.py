import random
from computations.GradePredictor import GradePredictor

class GradeImprovement:
    def __init__(self, student_profile):
        self.student_profile = student_profile
        self.gradepredictor = GradePredictor()
        self.current_grade = self.gradepredictor.predict_grade(student_profile)

    def _profile_from_genome(self, genome):
        attendance, sleep, exercise, study = genome
        return {
            **self.student_profile,
            "attendance_percentage": attendance,
            "sleep_hours": sleep,
            "exercise_frequency": exercise,
            "study_hours_per_day": study,
        }

    def fitness(self, genome):
        attendance, sleep, exercise, study = genome
        profile = self._profile_from_genome(genome)
        grade = self.gradepredictor.predict_grade(profile)

        delta_grade = grade - self.current_grade
        delta_effort = abs(attendance - self.student_profile["attendance_percentage"]) + 2 * abs(sleep - self.student_profile["sleep_hours"]) + abs(exercise - self.student_profile["exercise_frequency"]) + abs(study - self.student_profile["study_hours_per_day"])

        if delta_grade <= 0:
            return -10000
            
        return delta_grade * 10 - delta_effort * 100

    def batch_fitness(self, population):
        profiles = [self._profile_from_genome(genome) for genome in population]
        predicted_grades = self.gradepredictor.predict_grades(profiles)

        fitness_scores = []
        for genome, grade in zip(population, predicted_grades):
            attendance, sleep, exercise, study = genome
            delta_grade = grade - self.current_grade
            delta_effort = abs(attendance - self.student_profile["attendance_percentage"]) + 2 * abs(sleep - self.student_profile["sleep_hours"]) + abs(exercise - self.student_profile["exercise_frequency"]) + abs(study - self.student_profile["study_hours_per_day"])

            if delta_grade <= 0:
                fitness_scores.append(-10000)
            else:
                fitness_scores.append(delta_grade * 10 - delta_effort * 100)

        return fitness_scores, predicted_grades


    def create_genome(self):
        return [
            random.uniform(0, 100),  # attendance
            random.uniform(4, 9),  # sleep
            random.uniform(0,5),  # exercise  
            random.uniform(0,8),  # study hours
        ]

    def create_population(self, size):
        return [self.create_genome() for _ in range(size)]

    def select(self, ranked_population):
        selected_count = max(1, len(ranked_population) // 2)
        return [genome for genome, _, _ in ranked_population[:selected_count]]

    def crossover(self, parent1, parent2):
        return [
            random.choice([g1, g2])
            for g1, g2 in zip(parent1, parent2)
        ]

    def mutate(self, genome, mutation_rate=0.1):
        if random.random() < mutation_rate:
            index = random.randint(0, len(genome) - 1)
            if index == 0:  # attendance
                genome[index] += random.uniform(-1,1) 
                genome[index] = max(0, min(100, genome[index]))
            elif index == 1:  # sleep
                genome[index] += random.uniform(-1,1)
                genome[index] = max(4, min(9, genome[index]))
            elif index == 2:  # exercise
                genome[index] += random.uniform(-1,1)
                genome[index] = max(0, min(5, genome[index]))
            elif index == 3:  # study hours
                genome[index] += random.uniform(-1,1)
                genome[index] = max(0, min(8, genome[index]))
        return genome

    def genetic_algorithm(self, population_size=100, generations=50):
        population = self.create_population(population_size)

        for generation in range(generations):
            fitness_scores, predicted_grades = self.batch_fitness(population)
            ranked_population = sorted(
                zip(population, fitness_scores, predicted_grades),
                key=lambda item: item[1],
                reverse=True,
            )
            population = [genome for genome, _, _ in ranked_population]
            print(f"Generation {generation}: Best fitness = {ranked_population[0][1]:.4f}")

            selected = self.select(ranked_population)

            next_generation = population[:5]
            while len(next_generation) < population_size:
                parent1, parent2 = random.sample(selected, 2)
                child = self.crossover(parent1, parent2)
                child = self.mutate(child)
                next_generation.append(child)

            population = next_generation

        fitness_scores, predicted_grades = self.batch_fitness(population)
        ranked_population = sorted(
            zip(population, fitness_scores, predicted_grades),
            key=lambda item: item[1],
            reverse=True,
        )

        best_genome, _, best_grade = ranked_population[0]
        profile = self._profile_from_genome(best_genome)
        if abs(best_genome[0] - self.student_profile["attendance_percentage"]) < 1:
            profile["attendance_percentage"] = self.student_profile["attendance_percentage"]
        if abs(best_genome[1] - self.student_profile["sleep_hours"]) < 0.5:
            profile["sleep_hours"] = self.student_profile["sleep_hours"]
        if abs(best_genome[2] - self.student_profile["exercise_frequency"]) < 0.8:
            profile["exercise_frequency"] = self.student_profile["exercise_frequency"]
        if abs(best_genome[3] - self.student_profile["study_hours_per_day"]) < 0.15:
            profile["study_hours_per_day"] = self.student_profile["study_hours_per_day"]
        
        return self.student_profile, self.current_grade, profile, best_grade