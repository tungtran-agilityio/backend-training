-- View: total_students_per_professor
-- Shows the total number of students per professor, including professor name
CREATE OR REPLACE VIEW total_students_per_professor AS
SELECT
  p.sin AS professor_sin,
  p.name AS professor_name,
  COUNT(DISTINCT se.student_number) AS total_students
FROM professors p
LEFT JOIN timetables t ON t.professor_sin = p.sin
LEFT JOIN student_enrollments se ON se.timetable_id = t.id
GROUP BY p.sin, p.name;


-- View: course_popularity
-- Shows the total number of enrollments per course, including course name
CREATE OR REPLACE VIEW course_popularity AS
SELECT
  c.code AS course_code,
  c.name AS course_name,
  COUNT(se.student_number) AS total_enrollments
FROM courses c
LEFT JOIN timetables t ON t.course_code = c.code
LEFT JOIN student_enrollments se ON se.timetable_id = t.id
GROUP BY c.code, c.name
ORDER BY total_enrollments DESC;

-- View: active_timetable_capacity
-- Shows the number of students enrolled in active timetables, including course name, room, and percentage full
CREATE OR REPLACE VIEW active_timetable_capacity AS
SELECT
  t.id AS timetable_id,
  t.course_code,
  t.room,
  t.max_capacity,
  COUNT(se.student_number) AS enrolled,
  ROUND(100.0 * COUNT(se.student_number) / NULLIF(t.max_capacity,0), 2) AS percent_full
FROM timetables t
LEFT JOIN student_enrollments se ON se.timetable_id = t.id
WHERE t.status = 'active'
GROUP BY t.id, t.course_code, t.room, t.max_capacity;

-- View: student_enrollment_summary
-- Shows the number of enrollments per student, including student name, and last enrollment date
CREATE OR REPLACE VIEW student_enrollment_summary AS
SELECT
  s.student_number,
  s.first_name,
  s.last_name,
  COUNT(se.timetable_id) AS total_enrollments,
  MAX(se.enrollment_date) AS last_enrollment
FROM students s
LEFT JOIN student_enrollments se ON se.student_number = s.student_number
GROUP BY s.student_number, s.first_name, s.last_name;

-- View: faculty_professor_count
-- Shows the number of professors per faculty, including faculty name
CREATE OR REPLACE VIEW faculty_professor_count AS
SELECT
  f.id AS faculty_id,
  f.name AS faculty_name,
  COUNT(p.sin) AS professor_count
FROM faculties f
LEFT JOIN professors p ON p.faculty_id = f.id
GROUP BY f.id, f.name;