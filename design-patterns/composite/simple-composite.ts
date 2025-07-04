/**
 * Simple Composite Design Pattern Demo
 * 
 * The Composite pattern allows you to treat individual objects 
 * and compositions of objects uniformly.
 */

// Component interface - common operations for both leaf and composite
interface Component {
  getName(): string
  getSize(): number
  display(indent?: number): void
}

// Leaf class - represents files (cannot have children)
class File implements Component {
  constructor(private name: string, private size: number) { }

  getName(): string {
    return this.name
  }

  getSize(): number {
    return this.size
  }

  display(indent: number = 0): void {
    const spaces = '  '.repeat(indent)
    console.log(`${spaces}📄 ${this.name} (${this.size} bytes)`)
  }
}

// Composite class - represents folders (can have children)
class Folder implements Component {
  private children: Component[] = []

  constructor(private name: string) { }

  getName(): string {
    return this.name
  }

  // Composite operation: sum all children sizes
  getSize(): number {
    return this.children.reduce((total, child) => total + child.getSize(), 0)
  }

  // Composite operation: display this folder and all children
  display(indent: number = 0): void {
    const spaces = '  '.repeat(indent)
    console.log(`${spaces}📁 ${this.name}/ (${this.children.length} items, ${this.getSize()} bytes)`)

    // Recursively display all children
    this.children.forEach(child => child.display(indent + 1))
  }

  // Composite-specific methods
  add(component: Component): void {
    this.children.push(component)
  }

  remove(component: Component): void {
    const index = this.children.indexOf(component)
    if (index !== -1) {
      this.children.splice(index, 1)
    }
  }

  getChildren(): Component[] {
    return [...this.children]
  }
}

// Demo function
function simpleCompositeDemo(): void {
  console.log('🏗️ SIMPLE COMPOSITE PATTERN DEMO\n')

  // Create files (leaf objects)
  const file1 = new File('document.txt', 1000)
  const file2 = new File('image.jpg', 5000)
  const file3 = new File('script.js', 2000)

  // Create folders (composite objects)
  const rootFolder = new Folder('root')
  const documentsFolder = new Folder('documents')
  const mediaFolder = new Folder('media')

  // Build the structure
  console.log('📁 Building file structure...')
  rootFolder.add(documentsFolder)
  rootFolder.add(mediaFolder)

  documentsFolder.add(file1)
  documentsFolder.add(file3)

  mediaFolder.add(file2)

  console.log('\n🌳 File structure:')
  rootFolder.display()

  console.log('\n📊 Size calculations:')
  console.log(`Root folder size: ${rootFolder.getSize()} bytes`)
  console.log(`Documents folder size: ${documentsFolder.getSize()} bytes`)
  console.log(`Media folder size: ${mediaFolder.getSize()} bytes`)

  console.log('\n✨ Key Benefits:')
  console.log('• Files and folders treated uniformly')
  console.log('• Operations work recursively')
  console.log('• Easy to add new components')
  console.log('• Client code is simple')
}

// Export for use in other modules
export { Component, File, Folder, simpleCompositeDemo }

// Run demo
simpleCompositeDemo() 