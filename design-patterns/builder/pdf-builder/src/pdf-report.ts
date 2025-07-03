import { jsPDF } from 'jspdf'
import { ReportMetadata, ReportStyle, ReportSection, ReportTable, ReportChart } from './types'

export class PDFReport {
  private pdf: jsPDF
  private currentY: number = 20
  private pageHeight: number
  private pageWidth: number
  private style: ReportStyle
  private metadata: ReportMetadata
  private footerText?: string

  constructor(metadata: ReportMetadata, style: ReportStyle = {}) {
    this.pdf = new jsPDF()
    this.pageHeight = this.pdf.internal.pageSize.height
    this.pageWidth = this.pdf.internal.pageSize.width
    this.metadata = metadata
    this.style = {
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      fontFamily: 'helvetica',
      headerFontSize: 16,
      bodyFontSize: 12,
      margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
      ...style,
    }

    this.initializeDocument()
  }

  private initializeDocument(): void {
    // Set document properties
    this.pdf.setProperties({
      title: this.metadata.title,
      subject: this.metadata.subject || '',
      author: this.metadata.author || '',
      keywords: this.metadata.keywords?.join(', ') || '',
      creator: 'PDF Report Builder',
    })

    // Set default font
    this.pdf.setFont(this.style.fontFamily!, 'normal')
    this.currentY = this.style.margin!.top!
  }

  addHeader(text: string, level: 1 | 2 | 3 = 1): void {
    this.checkPageBreak(30)

    const fontSize = this.style.headerFontSize! - (level - 1) * 2
    this.pdf.setFontSize(fontSize)
    this.pdf.setFont(this.style.fontFamily!, 'bold')
    this.pdf.setTextColor(this.style.primaryColor!)

    this.pdf.text(text, this.style.margin!.left!, this.currentY)
    this.currentY += fontSize / 2 + 5

    // Add underline for level 1 headers
    if (level === 1) {
      const textWidth = this.pdf.getTextWidth(text)
      this.pdf.setDrawColor(this.style.primaryColor!)
      this.pdf.setLineWidth(0.5)
      this.pdf.line(
        this.style.margin!.left!,
        this.currentY - 2,
        this.style.margin!.left! + textWidth,
        this.currentY - 2
      )
    }

    this.currentY += 10
    this.resetTextStyle()
  }

  addSection(section: ReportSection): void {
    // Add title if provided
    if (section.title) {
      this.addHeader(section.title, 2)
    }

    // Calculate text height
    const lines = this.pdf.splitTextToSize(
      section.content,
      this.pageWidth - this.style.margin!.left! - this.style.margin!.right!
    )
    const lineHeight = (section.fontSize || this.style.bodyFontSize!) * 0.6
    const totalHeight = lines.length * lineHeight

    this.checkPageBreak(totalHeight + 20)

    // Set text style
    this.pdf.setFontSize(section.fontSize || this.style.bodyFontSize!)
    this.pdf.setFont(this.style.fontFamily!, section.fontStyle || 'normal')
    this.pdf.setTextColor('#000000')

    // Add content
    this.pdf.text(lines, this.style.margin!.left!, this.currentY)
    this.currentY += totalHeight + 15

    this.resetTextStyle()
  }

  addTable(table: ReportTable): void {
    if (table.title) {
      this.addHeader(table.title, 3)
    }

    const tableWidth = this.pageWidth - this.style.margin!.left! - this.style.margin!.right!
    const colWidth = tableWidth / table.headers.length
    const rowHeight = 10

    // Calculate total table height
    const totalRows = table.rows.length + 1 // +1 for header
    const totalHeight = totalRows * rowHeight + 20

    this.checkPageBreak(totalHeight)

    // Draw table header
    this.pdf.setFillColor(this.style.primaryColor!)
    this.pdf.setTextColor('#ffffff')
    this.pdf.setFont(this.style.fontFamily!, 'bold')

    let startX = this.style.margin!.left!
    table.headers.forEach((header, index) => {
      this.pdf.rect(startX, this.currentY, colWidth, rowHeight, 'F')
      this.pdf.text(
        header,
        startX + 2,
        this.currentY + rowHeight / 2 + 2
      )
      startX += colWidth
    })

    this.currentY += rowHeight

    // Draw table rows
    this.pdf.setTextColor('#000000')
    this.pdf.setFont(this.style.fontFamily!, 'normal')

    table.rows.forEach((row, rowIndex) => {
      startX = this.style.margin!.left!
      const fillColor = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff'
      this.pdf.setFillColor(fillColor)

      row.forEach((cell, colIndex) => {
        this.pdf.rect(startX, this.currentY, colWidth, rowHeight, 'F')
        this.pdf.rect(startX, this.currentY, colWidth, rowHeight, 'S')
        this.pdf.text(
          cell.toString(),
          startX + 2,
          this.currentY + rowHeight / 2 + 2
        )
        startX += colWidth
      })

      this.currentY += rowHeight
    })

    this.currentY += 15
    this.resetTextStyle()
  }

  addChart(chart: ReportChart): void {
    this.addHeader(chart.title, 3)

    // Simple text-based chart representation
    this.pdf.setFontSize(10)
    this.pdf.setFont(this.style.fontFamily!, 'normal')

    const maxValue = Math.max(...chart.data.map((d) => d.value))

    chart.data.forEach((dataPoint) => {
      const barLength = (dataPoint.value / maxValue) * 100
      const barText = `${dataPoint.label}: ${'█'.repeat(Math.floor(barLength / 5))} ${dataPoint.value}`

      this.checkPageBreak(15)
      this.pdf.text(barText, this.style.margin!.left!, this.currentY)
      this.currentY += 12
    })

    this.currentY += 10
    this.resetTextStyle()
  }

  addPageBreak(): void {
    this.pdf.addPage()
    this.currentY = this.style.margin!.top!
  }

  setFooter(text: string): void {
    this.footerText = text
  }

  private checkPageBreak(requiredHeight: number): void {
    const footerSpace = this.footerText ? 30 : 0
    if (this.currentY + requiredHeight > this.pageHeight - this.style.margin!.bottom! - footerSpace) {
      this.addFooterToCurrentPage()
      this.addPageBreak()
    }
  }

  private addFooterToCurrentPage(): void {
    if (this.footerText) {
      const footerY = this.pageHeight - this.style.margin!.bottom!
      this.pdf.setFontSize(8)
      this.pdf.setFont(this.style.fontFamily!, 'normal')
      this.pdf.setTextColor(this.style.secondaryColor!)
      this.pdf.text(this.footerText, this.style.margin!.left!, footerY)

      // Add page number
      const pageNumber = `Page ${this.pdf.getCurrentPageInfo().pageNumber}`
      const pageNumberWidth = this.pdf.getTextWidth(pageNumber)
      this.pdf.text(
        pageNumber,
        this.pageWidth - this.style.margin!.right! - pageNumberWidth,
        footerY
      )
    }
  }

  private resetTextStyle(): void {
    this.pdf.setFont(this.style.fontFamily!, 'normal')
    this.pdf.setFontSize(this.style.bodyFontSize!)
    this.pdf.setTextColor('#000000')
  }

  async generate(): Promise<Uint8Array> {
    // Add footer to the last page
    this.addFooterToCurrentPage()

    // Convert to Uint8Array
    const pdfArrayBuffer = this.pdf.output('arraybuffer')
    return new Uint8Array(pdfArrayBuffer)
  }
} 