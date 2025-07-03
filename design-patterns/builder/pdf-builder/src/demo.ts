import { PDFReportBuilder } from './pdf-report-builder'
import { ReportMetadata, ReportStyle } from './types'
import * as fs from 'fs'
import * as path from 'path'

async function createSampleReport() {
  console.log('🏗️  Creating PDF Report using Builder Pattern...')

  // Define report metadata
  const metadata: ReportMetadata = {
    title: 'Quarterly Business Report',
    author: 'John Doe',
    subject: 'Q4 2023 Performance Analysis',
    keywords: ['business', 'quarterly', 'performance', 'analysis'],
    creationDate: new Date(),
  }

  // Define custom styling
  const style: ReportStyle = {
    primaryColor: '#1e40af',
    secondaryColor: '#64748b',
    fontFamily: 'helvetica',
    headerFontSize: 18,
    bodyFontSize: 12,
    margin: {
      top: 25,
      right: 25,
      bottom: 25,
      left: 25,
    },
  }

  // Create the builder
  const builder = new PDFReportBuilder()

  try {
    // Build the report using the fluent interface
    const pdfBuffer = await builder
      .setMetadata(metadata)
      .setStyle(style)
      .addHeader('Quarterly Business Report', 1)
      .addSection({
        title: 'Executive Summary',
        content: `This report provides a comprehensive analysis of our company's performance during Q4 2023. 
				Key highlights include significant growth in revenue, expansion of our customer base, and successful 
				implementation of new operational strategies. The data presented in this report demonstrates our 
				continued commitment to excellence and sustainable growth.`,
        fontSize: 12,
      })
      .addSection({
        title: 'Financial Overview',
        content: `Our financial performance in Q4 2023 exceeded expectations across multiple metrics. 
				Revenue increased by 25% compared to the same period last year, while operational costs were 
				maintained within budget constraints. The following sections provide detailed breakdowns of 
				our financial achievements.`,
      })
      .addTable({
        title: 'Revenue Breakdown by Department',
        headers: ['Department', 'Q3 2023 ($)', 'Q4 2023 ($)', 'Growth (%)'],
        rows: [
          ['Sales', '150,000', '185,000', '23.3'],
          ['Marketing', '85,000', '102,000', '20.0'],
          ['Engineering', '200,000', '255,000', '27.5'],
          ['Support', '45,000', '52,000', '15.6'],
          ['Total', '480,000', '594,000', '23.8'],
        ],
      })
      .addChart({
        type: 'bar',
        title: 'Customer Satisfaction Scores',
        data: [
          { label: 'Product Quality', value: 8.5 },
          { label: 'Customer Service', value: 9.2 },
          { label: 'Delivery Time', value: 7.8 },
          { label: 'Value for Money', value: 8.1 },
          { label: 'Overall Experience', value: 8.4 },
        ],
      })
      .addPageBreak()
      .addHeader('Strategic Initiatives', 1)
      .addSection({
        title: 'Technology Investments',
        content: `During Q4, we made significant investments in technology infrastructure to support 
				our growing business needs. These investments include cloud migration, enhanced security 
				measures, and implementation of AI-driven analytics tools.`,
      })
      .addSection({
        title: 'Market Expansion',
        content: `We successfully entered three new geographic markets, establishing partnerships 
				with local distributors and setting up regional support centers. This expansion is expected 
				to contribute significantly to our growth in 2024.`,
      })
      .addTable({
        title: 'Market Expansion Results',
        headers: ['Region', 'Launch Date', 'Initial Customers', 'Revenue ($)'],
        rows: [
          ['Asia Pacific', 'Oct 2023', '145', '75,000'],
          ['Europe', 'Nov 2023', '89', '42,000'],
          ['South America', 'Dec 2023', '67', '28,000'],
        ],
      })
      .addSection({
        title: 'Looking Forward',
        content: `As we move into 2024, our focus remains on sustainable growth, customer satisfaction, 
				and innovation. We are confident that the foundations laid in Q4 2023 will support our 
				ambitious goals for the coming year.`,
        fontStyle: 'italic',
      })
      .addFooter('Confidential - Quarterly Business Report © 2023')
      .build()

    // Save the PDF
    const outputPath = path.join(__dirname, '..', 'output')
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true })
    }

    const fileName = 'quarterly-report.pdf'
    const filePath = path.join(outputPath, fileName)
    fs.writeFileSync(filePath, pdfBuffer)

    console.log('✅ PDF Report generated successfully!')
    console.log(`📄 File saved to: ${filePath}`)
    console.log(`📊 Report contains ${pdfBuffer.length} bytes`)

    return filePath
  } catch (error) {
    console.error('❌ Error generating PDF report:', error)
    throw error
  }
}

async function createMultipleReports() {
  console.log('\n🔄 Demonstrating builder reusability...')

  const builder = new PDFReportBuilder()

  // Set common style for all reports
  const commonStyle: ReportStyle = {
    primaryColor: '#059669',
    fontFamily: 'helvetica',
    headerFontSize: 16,
  }

  // Create first report
  const report1 = await builder
    .setMetadata({ title: 'Sales Report', author: 'Sales Team' })
    .setStyle(commonStyle)
    .addHeader('Monthly Sales Report')
    .addSection({
      title: 'Summary',
      content: 'Sales performance for the current month.',
    })
    .build()

  // Reset and create second report
  const report2 = await builder
    .reset()
    .setMetadata({ title: 'Technical Report', author: 'Engineering Team' })
    .setStyle({ ...commonStyle, primaryColor: '#dc2626' })
    .addHeader('System Performance Report')
    .addSection({
      title: 'Overview',
      content: 'System performance metrics and analysis.',
    })
    .build()

  // Save both reports
  const outputPath = path.join(__dirname, '..', 'output')
  fs.writeFileSync(path.join(outputPath, 'sales-report.pdf'), report1)
  fs.writeFileSync(path.join(outputPath, 'technical-report.pdf'), report2)

  console.log('✅ Multiple reports generated successfully!')
}

// Run the demo
async function runDemo() {
  try {
    await createSampleReport()
    await createMultipleReports()
    console.log('\n🎉 All demos completed successfully!')
  } catch (error) {
    console.error('Demo failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  runDemo()
}

export { createSampleReport, createMultipleReports } 