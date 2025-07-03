// Breakfast product class - the complex object we want to build
class Breakfast {
  private items: string[] = []
  private beverage: string = ''
  private sides: string[] = []
  private extras: string[] = []
  private specialInstructions: string = ''
  private totalPrice: number = 0

  addItem(item: string): void {
    this.items.push(item)
  }

  setBeverage(beverage: string): void {
    this.beverage = beverage
  }

  addSide(side: string): void {
    this.sides.push(side)
  }

  addExtra(extra: string): void {
    this.extras.push(extra)
  }

  setSpecialInstructions(instructions: string): void {
    this.specialInstructions = instructions
  }

  setTotalPrice(price: number): void {
    this.totalPrice = price
  }

  getDescription(): string {
    let description = '🍳 Breakfast Order:\n'

    if (this.items.length > 0) {
      description += `Main Items: ${this.items.join(', ')}\n`
    }

    if (this.beverage) {
      description += `Beverage: ${this.beverage}\n`
    }

    if (this.sides.length > 0) {
      description += `Sides: ${this.sides.join(', ')}\n`
    }

    if (this.extras.length > 0) {
      description += `Extras: ${this.extras.join(', ')}\n`
    }

    if (this.specialInstructions) {
      description += `Special Instructions: ${this.specialInstructions}\n`
    }

    description += `Total Price: $${this.totalPrice.toFixed(2)}`

    return description
  }
}

// Builder interface defining the construction steps
interface BreakfastBuilder {
  reset(): BreakfastBuilder
  addMainItem(item: string): BreakfastBuilder
  addBeverage(beverage: string): BreakfastBuilder
  addSide(side: string): BreakfastBuilder
  addExtra(extra: string): BreakfastBuilder
  addSpecialInstructions(instructions: string): BreakfastBuilder
  calculatePrice(): BreakfastBuilder
  build(): Breakfast
}

// Concrete builder implementation
class ConcreteBreakfastBuilder implements BreakfastBuilder {
  private breakfast: Breakfast

  constructor() {
    this.breakfast = new Breakfast()
  }

  reset(): BreakfastBuilder {
    this.breakfast = new Breakfast()
    return this
  }

  addMainItem(item: string): BreakfastBuilder {
    this.breakfast.addItem(item)
    return this
  }

  addBeverage(beverage: string): BreakfastBuilder {
    this.breakfast.setBeverage(beverage)
    return this
  }

  addSide(side: string): BreakfastBuilder {
    this.breakfast.addSide(side)
    return this
  }

  addExtra(extra: string): BreakfastBuilder {
    this.breakfast.addExtra(extra)
    return this
  }

  addSpecialInstructions(instructions: string): BreakfastBuilder {
    this.breakfast.setSpecialInstructions(instructions)
    return this
  }

  calculatePrice(): BreakfastBuilder {
    // Simple pricing logic - in real app, this could be more complex
    const itemPrices: Record<string, number> = {
      // Main items
      'scrambled eggs': 3.50,
      'fried eggs': 3.50,
      'pancakes': 4.00,
      'waffles': 4.50,
      'french toast': 4.00,
      'omelette': 5.00,

      // Beverages
      'coffee': 2.00,
      'tea': 1.50,
      'orange juice': 2.50,
      'milk': 1.50,

      // Sides
      'bacon': 2.50,
      'sausage': 2.50,
      'toast': 1.50,
      'hash browns': 2.00,
      'fruit salad': 3.00,

      // Extras
      'maple syrup': 0.50,
      'butter': 0.25,
      'jam': 0.50,
      'cheese': 1.00
    }

    let total = 0

    // Calculate price for all items
    const allItems = [
      ...this.breakfast['items'],
      this.breakfast['beverage'],
      ...this.breakfast['sides'],
      ...this.breakfast['extras']
    ].filter(Boolean)

    allItems.forEach(item => {
      const price = itemPrices[item.toLowerCase()] || 1.00
      total += price
    })

    this.breakfast.setTotalPrice(total)
    return this
  }

  build(): Breakfast {
    const result = this.breakfast
    this.reset()
    return result
  }
}

// Director class that knows how to construct specific breakfast types
class BreakfastDirector {
  private builder: BreakfastBuilder

  constructor(builder: BreakfastBuilder) {
    this.builder = builder
  }

  // Pre-defined breakfast combinations
  createAmericanBreakfast(): Breakfast {
    return this.builder
      .reset()
      .addMainItem('scrambled eggs')
      .addSide('bacon')
      .addSide('hash browns')
      .addSide('toast')
      .addBeverage('coffee')
      .addExtra('butter')
      .calculatePrice()
      .build()
  }

  createContinentalBreakfast(): Breakfast {
    return this.builder
      .reset()
      .addMainItem('french toast')
      .addSide('fruit salad')
      .addBeverage('orange juice')
      .addExtra('maple syrup')
      .calculatePrice()
      .build()
  }

  createHealthyBreakfast(): Breakfast {
    return this.builder
      .reset()
      .addMainItem('omelette')
      .addSide('fruit salad')
      .addSide('toast')
      .addBeverage('tea')
      .addSpecialInstructions('Use egg whites only, no oil')
      .calculatePrice()
      .build()
  }

  createCustomBreakfast(): Breakfast {
    return this.builder
      .reset()
      .addMainItem('pancakes')
      .addMainItem('fried eggs')
      .addSide('bacon')
      .addSide('sausage')
      .addBeverage('coffee')
      .addBeverage('orange juice')
      .addExtra('maple syrup')
      .addExtra('butter')
      .addSpecialInstructions('Extra crispy bacon, please!')
      .calculatePrice()
      .build()
  }
}

// Demo function to show the Builder pattern in action
function demoBreakfastBuilder(): void {
  console.log('🍳 Breakfast Builder Pattern Demo\n')
  console.log('='.repeat(50))

  const builder = new ConcreteBreakfastBuilder()
  const director = new BreakfastDirector(builder)

  // Example 1: Using director for pre-defined breakfasts
  console.log('\n1. American Breakfast (using Director):')
  const americanBreakfast = director.createAmericanBreakfast()
  console.log(americanBreakfast.getDescription())

  console.log('\n2. Continental Breakfast (using Director):')
  const continentalBreakfast = director.createContinentalBreakfast()
  console.log(continentalBreakfast.getDescription())

  console.log('\n3. Healthy Breakfast (using Director):')
  const healthyBreakfast = director.createHealthyBreakfast()
  console.log(healthyBreakfast.getDescription())

  // Example 2: Using builder directly for custom breakfast
  console.log('\n4. Custom Breakfast (using Builder directly):')
  const customBreakfast = builder
    .addMainItem('waffles')
    .addSide('bacon')
    .addBeverage('milk')
    .addExtra('maple syrup')
    .addSpecialInstructions('Make waffles extra fluffy')
    .calculatePrice()
    .build()

  console.log(customBreakfast.getDescription())

  // Example 3: Step-by-step building
  console.log('\n5. Step-by-step Custom Breakfast:')
  const stepByStepBreakfast = new ConcreteBreakfastBuilder()
    .addMainItem('omelette')
    .addSide('hash browns')
    .addSide('toast')
    .addBeverage('coffee')
    .addExtra('cheese')
    .addExtra('jam')
    .addSpecialInstructions('Cheese omelette with mushrooms and spinach')
    .calculatePrice()
    .build()

  console.log(stepByStepBreakfast.getDescription())

  console.log('\n' + '='.repeat(50))
  console.log('Demo completed! 🎉')
}

// Export classes for use in other modules
export {
  Breakfast,
  BreakfastBuilder,
  ConcreteBreakfastBuilder,
  BreakfastDirector,
  demoBreakfastBuilder
}

// Run demo if this file is executed directly
// Uncomment the line below to run the demo
// demoBreakfastBuilder()
