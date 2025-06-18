-- Create faculties table
CREATE TABLE faculties (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create professors table
CREATE TABLE professors (
    sin VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birthday DATE,
    faculty_id VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

-- Create courses table
CREATE TABLE courses (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    credits DECIMAL(3,1) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create semesters table
CREATE TABLE semesters (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create timetables table
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_sin VARCHAR(20),
    course_code VARCHAR(20),
    semester_id VARCHAR(20),
    schedule_time VARCHAR(100) NOT NULL,
    room VARCHAR(50),
    max_capacity SMALLINT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professor_sin) REFERENCES professors(sin),
    FOREIGN KEY (course_code) REFERENCES courses(code),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

-- Create students table
CREATE TABLE students (
    student_number VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    enrollment_date DATE NOT NULL,
    birthday DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create student_enrollments table
CREATE TABLE student_enrollments (
    timetable_id UUID,
    student_number VARCHAR(20),
    enrollment_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'enrolled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (timetable_id, student_number),
    FOREIGN KEY (timetable_id) REFERENCES timetables(id),
    FOREIGN KEY (student_number) REFERENCES students(student_number)
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at column
CREATE TRIGGER update_faculties_updated_at BEFORE UPDATE ON faculties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professors_updated_at BEFORE UPDATE ON professors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_enrollments_updated_at BEFORE UPDATE ON student_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
