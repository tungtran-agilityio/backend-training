const fs = require('fs');
const { faker } = require('@faker-js/faker');

const NUM_FACULTIES = 3;
const NUM_PROFESSORS = 10;
const NUM_COURSES = 10;
const NUM_SEMESTERS = 3;
const NUM_TIMETABLES = 30;
const NUM_STUDENTS = 200;
const NUM_ENROLLMENTS = 1000;

const esc = (str) => str.replace(/'/g, "''");

// Faculties
defineFaculties = () => {
  let faculties = [];
  for (let i = 1; i <= NUM_FACULTIES; i++) {
    faculties.push({
      id: `FAC${i.toString().padStart(3, '0')}`,
      name: esc(faker.company.name()),
    });
  }
  return faculties;
};

// Semesters
defineSemesters = () => {
  let semesters = [];
  for (let i = 1; i <= NUM_SEMESTERS; i++) {
    const year = 2000 + i;
    const start = new Date(`${year}-09-01`);
    const end = new Date(`${year}-12-20`);
    semesters.push({
      id: `SEM${i.toString().padStart(3, '0')}`,
      name: `Semester ${i}`,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      academic_year: `${year}-${year + 1}`,
    });
  }
  return semesters;
};

// Professors
defineProfessors = (faculties) => {
  let professors = [];
  let usedEmails = new Set();
  for (let i = 1; i <= NUM_PROFESSORS; i++) {
    const faculty = faker.helpers.arrayElement(faculties);
    let email;
    do {
      email = esc(faker.internet.email());
    } while (usedEmails.has(email));
    usedEmails.add(email);
    const birthday = faker.date.birthdate({ min: 25, max: 65, mode: 'age' });
    professors.push({
      sin: `P${i.toString().padStart(3, '0')}`,
      name: esc(faker.person.fullName()),
      birthday: birthday.toISOString().split('T')[0],
      faculty_id: faculty.id,
      email,
      hire_date: faker.date.past({ years: 20 }).toISOString().split('T')[0],
    });
  }
  return professors;
};

// Courses
defineCourses = () => {
  let courses = [];
  for (let i = 1; i <= NUM_COURSES; i++) {
    courses.push({
      code: `C${i.toString().padStart(3, '0')}`,
      name: esc(faker.word.words({ count: { min: 2, max: 4 } })),
      credits: faker.number.float({ min: 0.5, max: 30, precision: 0.5 }),
      description: esc(faker.lorem.sentence()),
    });
  }
  return courses;
};

// Students
defineStudents = () => {
  let students = [];
  let usedEmails = new Set();
  for (let i = 1; i <= NUM_STUDENTS; i++) {
    let email;
    do {
      email = esc(faker.internet.email());
    } while (usedEmails.has(email));
    usedEmails.add(email);
    const birthday = faker.date.birthdate({ min: 18, max: 99, mode: 'age' });
    students.push({
      student_number: `S${i.toString().padStart(3, '0')}`,
      first_name: esc(faker.person.firstName()),
      last_name: esc(faker.person.lastName()),
      email,
      enrollment_date: faker.date
        .past({ years: 5 })
        .toISOString()
        .split('T')[0],
      birthday: birthday.toISOString().split('T')[0],
    });
  }
  return students;
};

// Timetables
defineTimetables = (professors, courses, semesters) => {
  let timetables = [];
  for (let i = 1; i <= NUM_TIMETABLES; i++) {
    const professor = faker.helpers.arrayElement(professors);
    const course = faker.helpers.arrayElement(courses);
    const semester = faker.helpers.arrayElement(semesters);
    const status = faker.helpers.arrayElement([
      'active',
      'cancelled',
      'completed',
    ]);
    const max_capacity = faker.number.int({ min: 1, max: 500 });
    timetables.push({
      id: faker.string.uuid(),
      professor_sin: professor.sin,
      course_code: course.code,
      semester_id: semester.id,
      schedule_time: esc(
        faker.helpers.arrayElement([
          'Mon 9am',
          'Tue 10am',
          'Wed 11am',
          'Thu 2pm',
          'Fri 1pm',
        ])
      ),
      room: esc(faker.location.buildingNumber()),
      max_capacity,
      status,
    });
  }
  return timetables;
};

// Student Enrollments
defineEnrollments = (students, timetables) => {
  let enrollments = [];
  let usedPairs = new Set();
  for (let i = 0; i < NUM_ENROLLMENTS; i++) {
    let student, timetable, key;
    do {
      student = faker.helpers.arrayElement(students);
      timetable = faker.helpers.arrayElement(timetables);
      key = `${timetable.id}_${student.student_number}`;
    } while (usedPairs.has(key));
    usedPairs.add(key);
    const status = faker.helpers.arrayElement([
      'enrolled',
      'dropped',
      'completed',
    ]);
    enrollments.push({
      timetable_id: timetable.id,
      student_number: student.student_number,
      enrollment_date: faker.date
        .past({ years: 2 })
        .toISOString()
        .split('T')[0],
      status,
    });
  }
  return enrollments;
};

// Generate data
const faculties = defineFaculties();
const semesters = defineSemesters();
const professors = defineProfessors(faculties);
const courses = defineCourses();
const students = defineStudents();
const timetables = defineTimetables(professors, courses, semesters);
const enrollments = defineEnrollments(students, timetables);

// Ensure ./sql directory exists
if (!fs.existsSync('./sql')) {
  fs.mkdirSync('./sql', { recursive: true });
}

// Write SQL
let sql = '';

sql += '-- Faculties\n';
faculties.forEach(
  (f) =>
    (sql += `INSERT INTO faculties (id, name) VALUES ('${f.id}', '${f.name}');\n`)
);

sql += '\n-- Semesters\n';
semesters.forEach(
  (s) =>
    (sql += `INSERT INTO semesters (id, name, start_date, end_date, academic_year) VALUES ('${s.id}', '${s.name}', '${s.start_date}', '${s.end_date}', '${s.academic_year}');\n`)
);

sql += '\n-- Professors\n';
professors.forEach(
  (p) =>
    (sql += `INSERT INTO professors (sin, name, birthday, faculty_id, email, hire_date) VALUES ('${p.sin}', '${p.name}', '${p.birthday}', '${p.faculty_id}', '${p.email}', '${p.hire_date}');\n`)
);

sql += '\n-- Courses\n';
courses.forEach(
  (c) =>
    (sql += `INSERT INTO courses (code, name, credits, description) VALUES ('${c.code}', '${c.name}', ${c.credits}, '${c.description}');\n`)
);

sql += '\n-- Students\n';
students.forEach(
  (s) =>
    (sql += `INSERT INTO students (student_number, first_name, last_name, email, enrollment_date, birthday) VALUES ('${s.student_number}', '${s.first_name}', '${s.last_name}', '${s.email}', '${s.enrollment_date}', '${s.birthday}');\n`)
);

sql += '\n-- Timetables\n';
timetables.forEach(
  (t) =>
    (sql += `INSERT INTO timetables (id, professor_sin, course_code, semester_id, schedule_time, room, max_capacity, status) VALUES ('${t.id}', '${t.professor_sin}', '${t.course_code}', '${t.semester_id}', '${t.schedule_time}', '${t.room}', ${t.max_capacity}, '${t.status}');\n`)
);

sql += '\n-- Student Enrollments\n';
enrollments.forEach(
  (e) =>
    (sql += `INSERT INTO student_enrollments (timetable_id, student_number, enrollment_date, status) VALUES ('${e.timetable_id}', '${e.student_number}', '${e.enrollment_date}', '${e.status}');\n`)
);

fs.writeFileSync('./sql/mock-data.sql', sql);

console.log('Mock data SQL generated: ./sql/mock-data.sql');
