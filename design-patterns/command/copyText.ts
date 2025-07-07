/* ========= 1. Command contract ========= */
interface Command {
  execute(): void;
  undo(): void;
}

class TextDocument {
  private text: string = '';

  getText(): string {
    return this.text;
  }

  insert(text: string, position: number) {
    this.text = this.text.slice(0, position) + text + this.text.slice(position);
  }

  delete(start: number, end: number) {
    this.text = this.text.slice(0, start) + this.text.slice(end);
  }
}

class InsertCommand implements Command {
  constructor(private document: TextDocument, private text: string, private position: number) { }

  execute() {
    this.document.insert(this.text, this.position);
  }

  undo() {
    this.document.delete(this.position, this.position + this.text.length);
  }
}

class DeleteCommand implements Command {
  private deletedText: string = '';

  constructor(private document: TextDocument, private start: number, private end: number) { }

  execute() {
    this.deletedText = this.document.getText().slice(this.start, this.end);
    this.document.delete(this.start, this.end);
  }

  undo() {
    this.document.insert(this.deletedText, this.start);
  }
}

class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  execute(command: Command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }
}

// Usage
const document = new TextDocument();
const manager = new CommandManager();

console.log('=== Command Pattern Demo ===\n');

// Step 1: Insert text
console.log('1. Inserting "Hello, world!"...');
manager.execute(new InsertCommand(document, 'Hello, world!', 0));
console.log('   Document: "' + document.getText() + '"\n');

// Step 2: Insert more text
console.log('2. Inserting " How are you?" at position 12...');
manager.execute(new InsertCommand(document, ' How are you?', 12));
console.log('   Document: "' + document.getText() + '"\n');

// Step 3: Delete part of the text
console.log('3. Deleting characters 7-12 ("world")...');
manager.execute(new DeleteCommand(document, 7, 12));
console.log('   Document: "' + document.getText() + '"\n');

// Step 4: Undo the deletion
console.log('4. Undoing the deletion...');
manager.undo();
console.log('   Document: "' + document.getText() + '"\n');

// Step 5: Undo the second insertion
console.log('5. Undoing the second insertion...');
manager.undo();
console.log('   Document: "' + document.getText() + '"\n');

// Step 6: Redo the second insertion
console.log('6. Redoing the second insertion...');
manager.redo();
console.log('   Document: "' + document.getText() + '"\n');

// Step 7: Undo the first insertion
console.log('7. Undoing the first insertion...');
manager.undo();
manager.undo();
console.log('   Document: "' + document.getText() + '"\n');

console.log('=== Demo Complete ===');

