# Database Practice - University Database Diagram

## Database Overview

The university database diagram includes the following entities:
- **Faculties**: Academic departments
- **Professors**: Faculty members with their details
- **Courses**: Available courses and their information
- **Semesters**: Academic periods
- **TimeTables**: Course scheduling information
- **Students**: Student records
- **Student Enrollments**: Many-to-many relationship between students and courses

## Prerequisites

To export the D2 diagram to an image, you need to install D2:

### Installation

```bash
curl -fsSL https://d2lang.com/install.sh | sh -s --
```

### Export

```bash
# Export to different formats
d2 --layout elk database-practice/diagrams/university-database.d2 university-database.png
d2 --layout elk database-practice/diagrams/university-database.d2 university-database.pdf
```

