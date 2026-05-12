UPDATE courses SET
    current_predicted_grade = 78,
    final_predicted_grade = 82,
    predicted_grades = '[
        {"month": 1, "grade": 72},
        {"month": 2, "grade": 74},
        {"month": 3, "grade": 71},
        {"month": 4, "grade": 76},
        {"month": 5, "grade": 78}
    ]'::jsonb
WHERE student_id = '9491b299-0ee0-46ff-8d7e-78bddaf8808d' AND code = 'COMP2171';

UPDATE courses SET
    current_predicted_grade = 65,
    final_predicted_grade = 70,
    predicted_grades = '[
        {"month": 1, "grade": 58},
        {"month": 2, "grade": 62},
        {"month": 3, "grade": 60},
        {"month": 4, "grade": 64},
        {"month": 5, "grade": 65}
    ]'::jsonb
WHERE student_id = '9491b299-0ee0-46ff-8d7e-78bddaf8808d' AND code = 'ELET3460';
