// Component interface
interface Coffee {
  cost(): number;
  description(): string;
}

/*======== Concrete Component ========*/
class BasicCoffee implements Coffee {
  cost(): number {
    return 20_000; // base price in VND
  }
  description(): string {
    return 'Basic coffee';
  }
}

/*======== Base Decorator ========*/
abstract class CoffeeDecorator implements Coffee {
  // Wrapped object
  protected decoratedCoffee: Coffee;

  constructor(coffee: Coffee) {
    this.decoratedCoffee = coffee;
  }

  cost(): number {
    return this.decoratedCoffee.cost();
  }

  description(): string {
    return this.decoratedCoffee.description();
  }
}

/*======== Concrete Decorators ========*/
class MilkDecorator extends CoffeeDecorator {
  cost(): number {
    return super.cost() + 5_000;
  }
  description(): string {
    return super.description() + ', milk';
  }
}

class SugarDecorator extends CoffeeDecorator {
  cost(): number {
    return super.cost() + 3_000;
  }
  description(): string {
    return super.description() + ', sugar';
  }
}

class CreamDecorator extends CoffeeDecorator {
  cost(): number {
    return super.cost() + 7_000;
  }
  description(): string {
    return super.description() + ', whipping cream';
  }
}

/*======== Client code (usage) ========*/
const order1 = new MilkDecorator(new BasicCoffee());
console.log(order1.description()); // Basic coffee, milk
console.log(order1.cost());        // 25 000

const order2 = new SugarDecorator(new MilkDecorator(new BasicCoffee()));
console.log(order2.description()); // Basic coffee, milk, sugar
console.log(order2.cost());        // 28 000

const order3 = new CreamDecorator(
  new SugarDecorator(
    new MilkDecorator(
      new BasicCoffee())));
console.log(order3.description()); // Basic coffee, milk, sugar, whipping cream
console.log(order3.cost());        // 35 000