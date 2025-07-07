/* ============================================================================
 * 1. Element interface + concrete elements
 * -------------------------------------------------------------------------- */
interface DocumentElement {
  accept(visitor: Visitor): void;
}

class Paragraph implements DocumentElement {
  constructor(public text: string) { }
  accept(visitor: Visitor) { visitor.visitParagraph(this); }
}

class DocImage implements DocumentElement {
  constructor(public url: string, public alt: string) { }
  accept(visitor: Visitor) { visitor.visitImage(this); }
}

class Table implements DocumentElement {
  constructor(public rows: string[][]) { }
  accept(visitor: Visitor) { visitor.visitTable(this); }
}
/* ============================================================================
 * 2. Visitor interface + concrete visitors
 * -------------------------------------------------------------------------- */
interface Visitor {
  visitParagraph(p: Paragraph): void;
  visitImage(img: DocImage): void;
  visitTable(tbl: Table): void;
}

// --- HTML Renderer Visitor ---
class HtmlRenderer implements Visitor {
  html = '';
  visitParagraph(p: Paragraph) {
    this.html += `<p>${p.text}</p>\n`;
  }
  visitImage(img: DocImage) {
    this.html += `<img src="${img.url}" alt="${img.alt}" />\n`;
  }
  visitTable(tbl: Table) {
    this.html += '<table>\n';
    for (const row of tbl.rows) {
      this.html += '  <tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>\n';
    }
    this.html += '</table>\n';
  }
}

// --- Plain Text Export Visitor ---
class PlainTextExporter implements Visitor {
  text = '';
  visitParagraph(p: Paragraph) {
    this.text += p.text + '\n';
  }
  visitImage(img: DocImage) {
    this.text += `[Image: ${img.alt}]` + '\n';
  }
  visitTable(tbl: Table) {
    for (const row of tbl.rows) {
      this.text += row.join('\t') + '\n';
    }
  }
}

// --- Word Count Visitor ---
class WordCounter implements Visitor {
  count = 0;
  visitParagraph(p: Paragraph) {
    this.count += p.text.split(/\s+/).filter(Boolean).length;
  }
  visitImage(_: DocImage) { /* images not counted */ }
  visitTable(tbl: Table) {
    for (const row of tbl.rows)
      for (const cell of row)
        this.count += cell.split(/\s+/).filter(Boolean).length;
  }
}

/* ============================================================================
 * 3. Demo — one set of elements, many visitors
 * -------------------------------------------------------------------------- */
const doc: DocumentElement[] = [
  new Paragraph("Hello, world!"),
  new DocImage("cat.jpg", "A cute cat"),
  new Table([["Name", "Score"], ["Alice", "92"], ["Bob", "88"]])
];

const html = new HtmlRenderer();
const txt = new PlainTextExporter();
const wc = new WordCounter();

for (const el of doc) {
  el.accept(html);
  el.accept(txt);
  el.accept(wc);
}

console.log("HTML:\n", html.html);
console.log("Plain text:\n", txt.text);
console.log("Word count:", wc.count);
