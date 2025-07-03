// Prototype interface
type Prototype<T> = {
  clone(): T;
};

// Concrete class implementing Prototype
class Person implements Prototype<Person> {
  constructor(public name: string, public age: number, public address: { city: string }) {}

  clone(): Person {
    // Deep copy for nested objects
    return new Person(this.name, this.age, { ...this.address });
  }
}

// Demo usage
const original = new Person('Alice', 30, { city: 'New York' });
const copy = original.clone();

copy.name = 'Bob';
copy.address.city = 'Los Angeles';

console.log('Original:', original); // Alice, New York
console.log('Copy:', copy);         // Bob, Los Angeles
