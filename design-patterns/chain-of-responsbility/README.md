# Chain of Responsibility Pattern - Email Filter Example

This example demonstrates the Chain of Responsibility design pattern using an email filtering system.

## Overview

The Chain of Responsibility pattern allows you to pass requests along a chain of handlers. Each handler decides either to process the request or to pass it to the next handler in the chain.

## Implementation

### Components

1. **BaseEmailFilter** - Abstract base class that defines the chain structure
2. **SpamFilter** - Filters emails containing spam words
3. **AttachmentExtensionFilter** - Filters emails with disallowed file attachments
4. **BodyLengthFilter** - Filters emails with body content that's too short

### How it Works

1. Each filter inherits from `BaseEmailFilter`
2. Filters are chained together using `setNext()`
3. Each filter processes the email and either:
   - Returns `false` to reject the email
   - Calls `super.process()` to pass to the next filter
4. If all filters pass, the email is accepted (returns `true`)

## Usage

```bash
# Install dependencies
npm install

# Run the example
npm start

# Run with watch mode for development
npm run dev
```

## Example Output

The current example email:
```typescript
{
  from: 'test@test.com',
  to: 'test@test.com',
  subject: 'test',
  body: 'test', // Only 4 characters (less than minimum 10)
  attachments: ['test.jpg', 'test.pdf']
}
```

Returns `false` because the body is too short (4 characters < 10 minimum).

## Benefits

- **Single Responsibility**: Each filter has one specific responsibility
- **Open/Closed Principle**: Easy to add new filters without modifying existing code
- **Flexible**: Chain order can be easily changed
- **Decoupled**: Filters don't need to know about each other 