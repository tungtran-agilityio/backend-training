/* ============================================================================
 * 1. Template (abstract) base class
 * -------------------------------------------------------------------------- */
abstract class DataImporter {
  /** The “template method” */
  async run(): Promise<void> {
    const raw = await this.fetchData();
    const records = this.parse(raw);
    if (!this.validate(records)) throw new Error('Validation failed!');
    await this.save(records);
    console.log('✅ Import finished.');
  }

  /** Steps to override/extend */
  protected abstract fetchData(): Promise<string>;
  protected abstract parse(raw: string): any[];

  /** Optional hooks with default implementations */
  protected validate(records: any[]): boolean {
    console.log('Checking records:', records.length);
    return records.length > 0;
  }

  protected async save(records: any[]): Promise<void> {
    console.log(`Saving ${records.length} records to DB...`);
    // Simulate DB write
    await new Promise(r => setTimeout(r, 200));
  }
}

/* ============================================================================
 * 2. Concrete subclasses override only the steps they need
 * -------------------------------------------------------------------------- */
class CsvImporter extends DataImporter {
  protected async fetchData(): Promise<string> {
    console.log('Fetching CSV...');
    return 'id,name\n1,Alice\n2,Bob';
  }

  protected parse(raw: string): any[] {
    const [header, ...rows] = raw.trim().split('\n');
    const keys = header.split(',');
    return rows.map(row =>
      Object.fromEntries(row.split(',').map((v, i) => [keys[i], v]))
    );
  }
}

class JsonApiImporter extends DataImporter {
  protected async fetchData(): Promise<string> {
    console.log('Fetching JSON...');
    return JSON.stringify([
      { id: 1, name: 'Jane' },
      { id: 2, name: 'John' }
    ]);
  }

  protected parse(raw: string): any[] {
    return JSON.parse(raw);
  }

  protected validate(records: any[]): boolean {
    // Require unique IDs
    const ids = new Set(records.map(r => r.id));
    const ok = ids.size === records.length;
    if (!ok) console.log('Duplicate IDs found!');
    return ok;
  }
}

/* ============================================================================
 * 3. Demo: both importers use the same workflow, different steps
 * -------------------------------------------------------------------------- */
(async () => {
  const csv = new CsvImporter();
  await csv.run();

  const json = new JsonApiImporter();
  await json.run();
})();
