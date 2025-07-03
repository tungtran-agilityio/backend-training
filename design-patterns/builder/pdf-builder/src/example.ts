import { PDFReportBuilder } from './pdf-report-builder'
import * as fs from 'fs'

async function createSimpleReport() {
  // Create a builder instance
  const builder = new PDFReportBuilder()

  // Build a simple report using the fluent interface
  const pdfData = await builder
    .setMetadata({
      title: 'Monthly Sales Report',
      author: 'Sales Department',
      subject: 'January 2024 Sales Analysis',
    })
    .setStyle({
      primaryColor: '#2563eb',
      headerFontSize: 20,
      bodyFontSize: 11,
    })
    .addHeader('Monthly Sales Report - January 2024')
    .addSection({
      title: 'Executive Summary',
      content: 'This month we achieved excellent results with a 15% increase in sales compared to last month. Our team exceeded all targets and established strong customer relationships.',
    })
    .addTable({
      title: 'Sales by Region',
      headers: ['Region', 'Sales ($)', 'Target ($)', 'Achievement (%)'],
      rows: [
        ['North', '125,000', '100,000', '125%'],
        ['South', '98,000', '90,000', '109%'],
        ['East', '145,000', '120,000', '121%'],
        ['West', '87,000', '80,000', '109%'],
      ],
    })
    .addChart({
      type: 'bar',
      title: 'Top Products',
      data: [
        { label: 'Product A', value: 35000 },
        { label: 'Product B', value: 28000 },
        { label: 'Product C', value: 22000 },
        { label: 'Product D', value: 18000 },
      ],
    })
    .addFooter('Sales Report - Confidential')
    .build()

  // Save the PDF
  fs.writeFileSync('simple-report.pdf', pdfData)
  console.log('Simple report created: simple-report.pdf')
}

// Run if executed directly
if (require.main === module) {
  createSimpleReport().catch(console.error)
}

export { createSimpleReport } 