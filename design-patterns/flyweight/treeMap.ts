// flyweight.ts
// ---------- INTRINSIC STATE ----------
class TreeType {
  constructor(
    public readonly name: string,
    public readonly color: string,
    public readonly texture: string, // image file path
  ) { }

  draw(x: number, y: number) {
    // Assume drawing on canvas – demo prints to console
    console.log(`🌳  ${this.name} (${this.color}) at (${x}, ${y})`);
  }
}

// ---------- FLYWEIGHT FACTORY ----------
class TreeFactory {
  private static types: Map<string, TreeType> = new Map();

  static getTreeType(name: string, color: string, texture: string): TreeType {
    const key = `${name}_${color}_${texture}`;
    if (!this.types.has(key)) this.types.set(key, new TreeType(name, color, texture));
    return this.types.get(key)!;
  }

  static cacheSize() {
    return this.types.size;
  }
}

// ---------- EXTRINSIC STATE ----------
class Tree {
  constructor(
    private x: number,
    private y: number,
    private type: TreeType,
  ) { }

  draw() {
    this.type.draw(this.x, this.y);
  }
}

// ---------- CONTEXT ----------
class Forest {
  private trees: Tree[] = [];

  plantTree(x: number, y: number, name: string, color: string, texture: string) {
    const type = TreeFactory.getTreeType(name, color, texture);
    this.trees.push(new Tree(x, y, type));
  }

  draw() {
    this.trees.forEach(t => t.draw());
  }
}

// ---------- DEMO ----------
function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function memoryMB() {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

function runDemo() {
  console.log('Memory before:', memoryMB(), 'MB');

  const forest = new Forest();
  const treeTypes = [
    ['Oak', 'green', 'oak.png'],
    ['Pine', 'dark', 'pine.png'],
    ['Cherry', 'pink', 'cherry.png'],
  ] as const;

  for (let i = 0; i < 10_000; i++) {
    const [name, color, texture] = treeTypes[randomInt(treeTypes.length)];
    forest.plantTree(randomInt(500), randomInt(500), name, color, texture);
  }

  console.log('Planted 10 000 trees.');
  console.log('↳ unique TreeType flyweights:', TreeFactory.cacheSize());
  console.log('Memory after:', memoryMB(), 'MB');
}

runDemo();