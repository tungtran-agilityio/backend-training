// Email Spam Filter

interface Email {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments: string[];
}


abstract class BaseEmailFilter {
  protected next: BaseEmailFilter | null = null;

  setNext(next: BaseEmailFilter) {
    this.next = next;
    return next;
  }


  process(email: Email): boolean {
    if (this.next) {
      return this.next.process(email);
    }
    return true
  }
}


class SpamFilter extends BaseEmailFilter {
  private spamWords: string[] = ['spam', 'viagra', 'casino'];
  process(email: Email): boolean {
    const isSpam = this.spamWords.some(word => email.subject.includes(word)) || this.spamWords.some(word => email.body.includes(word));
    if (isSpam) {
      return false;
    }
    return super.process(email);
  }
}

class AttachmentExtensionFilter extends BaseEmailFilter {
  private allowedExtensions: string[] = ['jpg', 'png', 'pdf'];
  process(email: Email): boolean {
    const isAllowed = email.attachments.every(attachment => this.allowedExtensions.includes(attachment.split('.').pop() || ''));
    if (!isAllowed) {
      return false;
    }
    return super.process(email);
  }
}

class BodyLengthFilter extends BaseEmailFilter {
  private minLength: number = 10;
  process(email: Email): boolean {
    const isLongEnough = email.body.length >= this.minLength;
    if (!isLongEnough) {
      return false;
    }
    return super.process(email);
  }
}

// Usage

const spamFilter = new SpamFilter();
const attachmentExtensionFilter = new AttachmentExtensionFilter();
const bodyLengthFilter = new BodyLengthFilter();

spamFilter.setNext(attachmentExtensionFilter).setNext(bodyLengthFilter);

// Test Case 1: Valid email
const email1: Email = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Meeting tomorrow',
  body: 'Hi, let\'s have a meeting tomorrow at 10 AM.',
  attachments: ['agenda.pdf', 'schedule.jpg'],
}
console.log('Test 1 - Valid email:', spamFilter.process(email1))

// Test Case 2: Spam email (contains spam word in subject)
const email2: Email = {
  from: 'spammer@evil.com',
  to: 'victim@example.com',
  subject: 'Buy viagra now!',
  body: 'Special offer for you.',
  attachments: ['offer.pdf'],
}
console.log('Test 2 - Spam in subject:', spamFilter.process(email2))

// Test Case 3: Spam email (contains spam word in body)
const email3: Email = {
  from: 'casino@luck.com',
  to: 'player@example.com',
  subject: 'Welcome bonus',
  body: 'Visit our casino for amazing rewards!',
  attachments: ['bonus.jpg'],
}
console.log('Test 3 - Spam in body:', spamFilter.process(email3))

// Test Case 4: Invalid attachment extension
const email4: Email = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Important document',
  body: 'Please find the attached document.',
  attachments: ['document.exe', 'report.jpg'],
}
console.log('Test 4 - Invalid attachment:', spamFilter.process(email4))

// Test Case 5: Body too short
const email5: Email = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Quick note',
  body: 'Hi',
  attachments: ['note.pdf'],
}
console.log('Test 5 - Short body:', spamFilter.process(email5))

// Test Case 6: Multiple issues (spam + invalid attachment)
const email6: Email = {
  from: 'spammer@evil.com',
  to: 'victim@example.com',
  subject: 'Free casino money',
  body: 'Get rich quick with our casino!',
  attachments: ['malware.exe'],
}
console.log('Test 6 - Multiple issues:', spamFilter.process(email6))

// Test Case 7: Valid email with multiple attachments
const email7: Email = {
  from: 'colleague@company.com',
  to: 'team@company.com',
  subject: 'Project update',
  body: 'Here are the latest project files and documentation for review.',
  attachments: ['report.pdf', 'diagram.png', 'data.jpg'],
}
console.log('Test 7 - Multiple valid attachments:', spamFilter.process(email7))

// Test Case 8: Empty attachments array
const email8: Email = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'No attachments',
  body: 'This email has no attachments to process.',
  attachments: [],
}
console.log('Test 8 - No attachments:', spamFilter.process(email8))

// Test Case 9: Edge case - body exactly at minimum length
const email9: Email = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Short message',
  body: '1234567890', // Exactly 10 characters
  attachments: ['file.pdf'],
}
console.log('Test 9 - Minimum body length:', spamFilter.process(email9))

// Test Case 10: Mixed valid/invalid attachments
const email10: Email = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Mixed files',
  body: 'Some files are valid, others are not.',
  attachments: ['valid.pdf', 'invalid.exe', 'valid.jpg'],
}
console.log('Test 10 - Mixed attachments:', spamFilter.process(email10))