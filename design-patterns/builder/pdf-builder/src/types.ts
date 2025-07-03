export interface ReportSection {
  title: string
  content: string
  fontSize?: number
  fontStyle?: 'normal' | 'bold' | 'italic'
}

export interface ReportTable {
  headers: string[]
  rows: string[][]
  title?: string
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie'
  title: string
  data: Array<{ label: string; value: number }>
}

export interface ReportMetadata {
  title: string
  author?: string
  subject?: string
  keywords?: string[]
  creationDate?: Date
}

export interface ReportStyle {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  headerFontSize?: number
  bodyFontSize?: number
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface IPDFReportBuilder {
  setMetadata(metadata: ReportMetadata): IPDFReportBuilder
  setStyle(style: ReportStyle): IPDFReportBuilder
  addHeader(text: string, level?: 1 | 2 | 3): IPDFReportBuilder
  addSection(section: ReportSection): IPDFReportBuilder
  addTable(table: ReportTable): IPDFReportBuilder
  addChart(chart: ReportChart): IPDFReportBuilder
  addPageBreak(): IPDFReportBuilder
  addFooter(text: string): IPDFReportBuilder
  build(): Promise<Uint8Array>
} 