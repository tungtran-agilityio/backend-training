class EditorState {            // Memento
  constructor(
    readonly content: string,
    readonly cursorPos: number
  ) { }
}

class TextEditor {             // Originator
  private content = '';
  private cursor = 0;

  type(text: string) {
    this.content += text;
    this.cursor += text.length;
  }

  getState(): EditorState {
    return new EditorState(this.content, this.cursor);
  }
  restore(state: EditorState) {
    this.content = state.content;
    this.cursor = state.cursorPos;
  }
}

class UndoManager {            // Caretaker
  private stack: EditorState[] = [];
  constructor(private editor: TextEditor) { }

  backup() { this.stack.push(this.editor.getState()); }
  undo() { if (this.stack.length) this.editor.restore(this.stack.pop()!); }
}

// Usage
const editor = new TextEditor();
const undoManager = new UndoManager(editor);

editor.type('Hello, ');
undoManager.backup();

editor.type('world!');
undoManager.backup();

console.log(editor.getState());

undoManager.undo();
console.log(editor.getState());

undoManager.undo();
console.log(editor.getState());