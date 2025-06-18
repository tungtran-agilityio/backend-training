-- =============================
-- SQL Practice Questions for University Database
-- =============================

-- QUESTION 1:
-- Find all professors in the '...' faculty

SELECT professors.sin, professors.name, professors.email
FROM professors
JOIN faculties ON professors.faculty_id = faculties.id
WHERE faculties.name = 'Fisher, Toy and Deckow';

-- QUESTION 2:
-- Count the number of courses offered in each semester

SELECT semesters.name AS semester_name, semesters.academic_year, COUNT(DISTINCT timetables.course_code) AS course_count
FROM semesters
LEFT JOIN timetables ON semesters.id = timetables.semester_id
GROUP BY semesters.id
ORDER BY semesters.academic_year, semesters.name;

-- QUESTION 3
-- Find all students who are enrolled in more than 2 courses

SELECT students.student_number, students.first_name, students.last_name, students.email
FROM students
WHERE students.student_number IN (
    SELECT student_enrollments.student_number
    FROM student_enrollments
    GROUP BY student_enrollments.student_number
    HAVING COUNT(student_enrollments.timetable_id) > 2
);

-- QUESTION 4:
-- List all active timetable entries with professor name, course name, semester, and room

SELECT 
    professors.name AS professor_name,
    courses.name AS course_name,
    semesters.name AS semester_name,
    timetables.schedule_time,
    timetables.room,
    timetables.max_capacity
FROM timetables
JOIN professors ON timetables.professor_sin = professors.sin
JOIN courses ON timetables.course_code = courses.code
JOIN semesters ON timetables.semester_id = semesters.id
WHERE timetables.status = 'active'
ORDER BY semesters.name, courses.name;

-- QUESTION 5:
-- Rank courses by their total enrollments and show the ranking

SELECT 
    courses.code,
    courses.name,
    COUNT(student_enrollments.student_number) AS total_enrollments,
    RANK() OVER (ORDER BY COUNT(student_enrollments.student_number) DESC) AS popularity_rank
FROM courses
LEFT JOIN timetables ON courses.code = timetables.course_code
LEFT JOIN student_enrollments ON timetables.id = student_enrollments.timetable_id
GROUP BY courses.code, courses.name
ORDER BY popularity_rank;

-- QUESTION 6:
-- Calculate the enrollment percentage for each timetable (enrolled students / max capacity * 100)

SELECT 
    timetables.id AS timetable_id,
    courses.name AS course_name,
    timetables.room,
    timetables.max_capacity,
    COUNT(student_enrollments.student_number) AS enrolled_students,
    CASE 
        WHEN timetables.max_capacity > 0 THEN ROUND((COUNT(student_enrollments.student_number)::decimal / timetables.max_capacity) * 100, 2)
        ELSE 0
    END AS enrollment_percentage
FROM timetables
JOIN courses ON timetables.course_code = courses.code
LEFT JOIN student_enrollments ON timetables.id = student_enrollments.timetable_id AND student_enrollments.status = 'enrolled'
GROUP BY timetables.id, courses.name, timetables.room, timetables.max_capacity
ORDER BY enrollment_percentage DESC;

-- QUESTION 7:
-- Find all professors who were hired in the last 5 years

SELECT 
    sin,
    name,
    email,
    hire_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date)) AS years_since_hire
FROM professors
WHERE hire_date IS NOT NULL 
    AND hire_date >= CURRENT_DATE - INTERVAL '5 years'
ORDER BY hire_date DESC;

-- QUESTION 8:
-- Find all students who are NOT enrolled in any course

SELECT students.student_number, students.first_name, students.last_name, students.email
FROM students
WHERE NOT EXISTS (
    SELECT 1 
    FROM student_enrollments
    WHERE student_enrollments.student_number = students.student_number
        AND student_enrollments.status = 'enrolled'
);
