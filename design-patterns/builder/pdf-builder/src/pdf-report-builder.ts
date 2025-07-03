import { PDFReport } from './pdf-report'
import {
  IPDFReportBuilder,
  ReportMetadata,
  ReportStyle,
  ReportSection,
  ReportTable,
  ReportChart,
} from './types'

export class PDFReportBuilder implements IPDFReportBuilder {
  private metadata: ReportMetadata = { title: 'Untitled Report' }
  private style: ReportStyle = {}
  private elements: Array<{
    type: 'header' | 'section' | 'table' | 'chart' | 'pageBreak'
    data: any
    level?: number
  }> = []
  private footerText?: string

  /**
   * Set the metadata for the PDF report
   */
  setMetadata(metadata: ReportMetadata): IPDFReportBuilder {
    this.metadata = { ...this.metadata, ...metadata }
    return this
  }

  /**
   * Set the styling options for the PDF report
   */
  setStyle(style: ReportStyle): IPDFReportBuilder {
    this.style = { ...this.style, ...style }
    return this
  }

  /**
   * Add a header to the report
   */
  addHeader(text: string, level: 1 | 2 | 3 = 1): IPDFReportBuilder {
    this.elements.push({
      type: 'header',
      data: text,
      level,
    })
    return this
  }

  /**
   * Add a section with content to the report
   */
  addSection(section: ReportSection): IPDFReportBuilder {
    this.elements.push({
      type: 'section',
      data: section,
    })
    return this
  }

  /**
   * Add a table to the report
   */
  addTable(table: ReportTable): IPDFReportBuilder {
    this.elements.push({
      type: 'table',
      data: table,
    })
    return this
  }

  /**
   * Add a chart to the report
   */
  addChart(chart: ReportChart): IPDFReportBuilder {
    this.elements.push({
      type: 'chart',
      data: chart,
    })
    return this
  }

  /**
   * Add a page break to the report
   */
  addPageBreak(): IPDFReportBuilder {
    this.elements.push({
      type: 'pageBreak',
      data: null,
    })
    return this
  }

  /**
   * Set footer text for all pages
   */
  addFooter(text: string): IPDFReportBuilder {
    this.footerText = text
    return this
  }

  /**
 * Build and generate the PDF report
 */
  async build(): Promise<Uint8Array> {
    const report = new PDFReport(this.metadata, this.style)

    // Set footer if provided
    if (this.footerText) {
      report.setFooter(this.footerText)
    }

    // Add all elements to the report
    for (const element of this.elements) {
      switch (element.type) {
        case 'header':
          report.addHeader(element.data, element.level as 1 | 2 | 3)
          break
        case 'section':
          report.addSection(element.data)
          break
        case 'table':
          report.addTable(element.data)
          break
        case 'chart':
          report.addChart(element.data)
          break
        case 'pageBreak':
          report.addPageBreak()
          break
      }
    }

    return await report.generate()
  }

  /**
   * Reset the builder to create a new report
   */
  reset(): IPDFReportBuilder {
    this.metadata = { title: 'Untitled Report' }
    this.style = {}
    this.elements = []
    this.footerText = undefined
    return this
  }

  /**
   * Create a clone of the current builder state
   */
  clone(): PDFReportBuilder {
    const clonedBuilder = new PDFReportBuilder()
    clonedBuilder.metadata = { ...this.metadata }
    clonedBuilder.style = { ...this.style }
    clonedBuilder.elements = [...this.elements]
    clonedBuilder.footerText = this.footerText
    return clonedBuilder
  }
} 