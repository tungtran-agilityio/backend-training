-- =============================
-- faculties table
-- =============================

COMMENT ON COLUMN faculties.id IS 'Unique code for each faculty (PK)';
COMMENT ON COLUMN faculties.name IS 'Official name of the faculty';

-- =============================
-- professors table
-- =============================

COMMENT ON COLUMN professors.sin IS 'Unique SIN for each professor (PK)';
COMMENT ON COLUMN professors.name IS 'Full name of the professor';
COMMENT ON COLUMN professors.birthday IS 'Professor''s date of birth (18-100 years old)';
COMMENT ON COLUMN professors.faculty_id IS 'Faculty to which the professor belongs (FK)';
COMMENT ON COLUMN professors.email IS 'Professor''s email address (unique)';
COMMENT ON COLUMN professors.hire_date IS 'Date the professor was hired';

-- Enforce email format (simple regex)
ALTER TABLE professors ADD CONSTRAINT professors_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE professors ADD CONSTRAINT professors_age_check
CHECK (
  birthday IS NULL OR
  (EXTRACT(YEAR FROM age(birthday)) >= 18 AND EXTRACT(YEAR FROM age(birthday)) < 100)
); 

-- =============================
-- courses table
-- =============================

COMMENT ON COLUMN courses.code IS 'Unique code for each course (PK)';
COMMENT ON COLUMN courses.name IS 'Official course name';
COMMENT ON COLUMN courses.credits IS 'Credit value for the course (0.5-30)';
COMMENT ON COLUMN courses.description IS 'Description of the course';

ALTER TABLE courses ADD CONSTRAINT courses_credits_range CHECK (credits >= 0.5 AND credits <= 30);

-- =============================
-- semesters table
-- =============================

COMMENT ON COLUMN semesters.id IS 'Unique code for each semester (PK)';
COMMENT ON COLUMN semesters.name IS 'Name of the semester';
COMMENT ON COLUMN semesters.start_date IS 'Start date of the semester';
COMMENT ON COLUMN semesters.end_date IS 'End date of the semester';
COMMENT ON COLUMN semesters.academic_year IS 'Academic year (e.g., 2024-2025)';

ALTER TABLE semesters ADD CONSTRAINT semesters_dates_check CHECK (start_date < end_date);
ALTER TABLE semesters ADD CONSTRAINT semesters_academic_year_format CHECK (academic_year ~* '^[0-9]{4}-[0-9]{4}$');


-- =============================
-- timetables table
-- =============================
COMMENT ON COLUMN timetables.id IS 'Unique identifier for each timetable entry (PK)';
COMMENT ON COLUMN timetables.professor_sin IS 'Professor assigned to the timetable (FK)';
COMMENT ON COLUMN timetables.course_code IS 'Course scheduled (FK)';
COMMENT ON COLUMN timetables.semester_id IS 'Semester for the timetable (FK)';
COMMENT ON COLUMN timetables.schedule_time IS 'Time and days for the class';
COMMENT ON COLUMN timetables.room IS 'Room where the class is held';
COMMENT ON COLUMN timetables.max_capacity IS 'Maximum number of students allowed (1-500)';
COMMENT ON COLUMN timetables.status IS 'Status of the timetable (active, cancelled, completed)';

ALTER TABLE timetables ADD CONSTRAINT timetables_max_capacity_range CHECK (max_capacity IS NULL OR (max_capacity >= 1 AND max_capacity <= 500));
ALTER TABLE timetables ADD CONSTRAINT timetables_status_enum CHECK (status IN ('active', 'cancelled', 'completed'));

-- =============================
-- students table
-- =============================

COMMENT ON COLUMN students.student_number IS 'Unique student number (PK)';
COMMENT ON COLUMN students.first_name IS 'Student''s first name';
COMMENT ON COLUMN students.last_name IS 'Student''s last name';
COMMENT ON COLUMN students.email IS 'Student''s email address (unique)';
COMMENT ON COLUMN students.enrollment_date IS 'Date the student enrolled';
COMMENT ON COLUMN students.birthday IS 'Student''s date of birth (18-100 years old)';
COMMENT ON COLUMN students.created_at IS 'Record creation timestamp (system entered)';
COMMENT ON COLUMN students.updated_at IS 'Record last update timestamp (system entered)';

ALTER TABLE students ADD CONSTRAINT students_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE students ADD CONSTRAINT students_age_check
CHECK (
  birthday IS NULL OR
  (EXTRACT(YEAR FROM age(birthday)) >= 18 AND EXTRACT(YEAR FROM age(birthday)) < 100)
);

-- =============================
-- student_enrollments table
-- =============================

COMMENT ON COLUMN student_enrollments.timetable_id IS 'Timetable entry for enrollment (FK, PK)';
COMMENT ON COLUMN student_enrollments.student_number IS 'Student enrolled (FK, PK)';
COMMENT ON COLUMN student_enrollments.enrollment_date IS 'Date of enrollment';
COMMENT ON COLUMN student_enrollments.status IS 'Status of the enrollment (enrolled, dropped, completed)';

ALTER TABLE student_enrollments ADD CONSTRAINT student_enrollments_status_enum CHECK (status IN ('enrolled', 'dropped', 'completed'));
