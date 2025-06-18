BEGIN;

-- =============================
-- faculties table
-- =============================

-- Valid faculty
INSERT INTO faculties (id, name) VALUES ('FAC001', 'Faculty of Science');
-- Duplicate PK (should fail)
INSERT INTO faculties (id, name) VALUES ('FAC001', 'Faculty of Arts');
-- NULL PK (should fail)
INSERT INTO faculties (id, name) VALUES (NULL, 'Faculty of Law');

-- =============================
-- professors table
-- =============================

-- Valid professor
INSERT INTO professors (sin, name, email, birthday) VALUES ('P001', 'Prof Valid', 'prof.valid@example.com', '1980-01-01');
-- Duplicate SIN (should fail)
INSERT INTO professors (sin, name, email) VALUES ('P001', 'Prof Duplicate', 'prof.dup@example.com');
-- Invalid email (should fail)
INSERT INTO professors (sin, name, email) VALUES ('P002', 'Prof Invalid Email', 'not-an-email');
-- Age < 18 (should fail)
INSERT INTO professors (sin, name, email, birthday) VALUES ('P003', 'Prof Too Young', 'prof.young@example.com', CURRENT_DATE - INTERVAL '17 years');
-- Age >= 100 (should fail)
INSERT INTO professors (sin, name, email, birthday) VALUES ('P004', 'Prof Too Old', 'prof.old@example.com', CURRENT_DATE - INTERVAL '100 years');
-- Valid with NULL birthday (should succeed)
INSERT INTO professors (sin, name, email, birthday) VALUES ('P005', 'Prof No Birthday', 'prof.nobd@example.com', NULL);

-- =============================
-- courses table
-- =============================

-- Valid course
INSERT INTO courses (code, name, credits) VALUES ('CS101', 'Intro to CS', 3.0);
-- credits < 0.5 (should fail)
INSERT INTO courses (code, name, credits) VALUES ('CS102', 'Bad Credits Low', 0.4);
-- credits > 30 (should fail)
INSERT INTO courses (code, name, credits) VALUES ('CS103', 'Bad Credits High', 31.0);

-- =============================
-- semesters table
-- =============================

-- Valid semester
INSERT INTO semesters (id, name, start_date, end_date, academic_year) VALUES ('SEM001', 'Fall 2024', '2024-09-01', '2024-12-20', '2024-2025');
-- start_date >= end_date (should fail)
INSERT INTO semesters (id, name, start_date, end_date, academic_year) VALUES ('SEM002', 'Bad Dates', '2024-12-20', '2024-09-01', '2024-2025');
-- Invalid academic_year format (should fail)
INSERT INTO semesters (id, name, start_date, end_date, academic_year) VALUES ('SEM003', 'Bad Year', '2024-09-01', '2024-12-20', '2024/2025');

-- =============================
-- timetables table
-- =============================

-- Valid timetable
INSERT INTO timetables (professor_sin, course_code, semester_id, schedule_time, room, max_capacity, status)
VALUES ('P001', 'CS101', 'SEM001', 'Mon 9am', 'A101', 30, 'active');
-- max_capacity < 1 (should fail)
INSERT INTO timetables (professor_sin, course_code, semester_id, schedule_time, room, max_capacity, status)
VALUES ('P001', 'CS101', 'SEM001', 'Tue 10am', 'A102', 0, 'active');
-- max_capacity > 500 (should fail)
INSERT INTO timetables (professor_sin, course_code, semester_id, schedule_time, room, max_capacity, status)
VALUES ('P001', 'CS101', 'SEM001', 'Wed 11am', 'A103', 501, 'active');
-- Invalid status (should fail)
INSERT INTO timetables (professor_sin, course_code, semester_id, schedule_time, room, max_capacity, status)
VALUES ('P001', 'CS101', 'SEM001', 'Thu 12pm', 'A104', 20, 'pending');

-- =============================
-- students table
-- =============================

-- Valid student
INSERT INTO students (student_number, first_name, last_name, email, enrollment_date, birthday)
VALUES ('S001', 'Alice', 'Smith', 'alice.smith@example.com', '2024-09-01', '2000-01-01');
-- Duplicate student_number (should fail)
INSERT INTO students (student_number, first_name, last_name, email, enrollment_date, birthday)
VALUES ('S001', 'Bob', 'Jones', 'bob.jones@example.com', '2024-09-01', '2000-01-01');
-- Invalid email (should fail)
INSERT INTO students (student_number, first_name, last_name, email, enrollment_date, birthday)
VALUES ('S002', 'Charlie', 'Brown', 'not-an-email', '2024-09-01', '2000-01-01');
-- Age < 18 (should fail)
INSERT INTO students (student_number, first_name, last_name, email, enrollment_date, birthday)
VALUES ('S003', 'Young', 'Student', 'young.student@example.com', '2024-09-01', CURRENT_DATE - INTERVAL '17 years');
-- Age >= 100 (should fail)
INSERT INTO students (student_number, first_name, last_name, email, enrollment_date, birthday)
VALUES ('S004', 'Old', 'Student', 'old.student@example.com', '2024-09-01', CURRENT_DATE - INTERVAL '100 years');

-- =============================
-- student_enrollments table
-- =============================

-- Valid enrollment
INSERT INTO student_enrollments (timetable_id, student_number, enrollment_date, status)
SELECT t.id, 'S001', '2024-09-01', 'enrolled'
FROM timetables t WHERE t.course_code = 'CS101' LIMIT 1;
-- Invalid status (should fail)
INSERT INTO student_enrollments (timetable_id, student_number, enrollment_date, status)
SELECT t.id, 'S001', '2024-09-01', 'invalid_status'
FROM timetables t WHERE t.course_code = 'CS101' LIMIT 1;

ROLLBACK; -- Undo all test data 