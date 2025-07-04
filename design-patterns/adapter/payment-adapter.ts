// Payment Adapter Pattern Demo
// This example shows how to integrate different payment providers with incompatible APIs
// into a unified interface using the adapter pattern

// =============================================================================
// Target Interface - What our application expects
// =============================================================================

interface PaymentProcessor {
  processPayment(amount: number, currency: string, paymentMethod: string): Promise<PaymentResult>
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>
}

interface PaymentResult {
  success: boolean
  transactionId: string
  message: string
  timestamp: Date
}

interface RefundResult {
  success: boolean
  refundId: string
  amount: number
  message: string
}

interface TransactionStatus {
  id: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount: number
  currency: string
}

// =============================================================================
// Third-party APIs with different interfaces (Adaptees)
// =============================================================================

// Stripe-like API
class StripeAPI {
  async createCharge(data: {
    amount: number // in cents
    currency: string
    source: string
    description?: string
  }) {
    // Simulate API call
    await this.delay(100)
    const chargeId = `ch_${this.generateId()}`

    return {
      id: chargeId,
      object: 'charge',
      amount: data.amount,
      currency: data.currency,
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
      source: data.source
    }
  }

  async createRefund(chargeId: string, amount?: number) {
    await this.delay(100)
    return {
      id: `re_${this.generateId()}`,
      object: 'refund',
      amount: amount || 0,
      charge: chargeId,
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000)
    }
  }

  async retrieveCharge(chargeId: string) {
    await this.delay(50)
    return {
      id: chargeId,
      object: 'charge',
      amount: 1000,
      currency: 'usd',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000)
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 15)
  }
}

// PayPal-like API
class PayPalAPI {
  async executePayment(payment: {
    total: string
    currency: string
    payment_method: string
    description?: string
  }) {
    await this.delay(150)
    const paymentId = `PAY-${this.generateId().toUpperCase()}`

    return {
      id: paymentId,
      state: 'approved',
      create_time: new Date().toISOString(),
      transactions: [{
        amount: {
          total: payment.total,
          currency: payment.currency
        },
        description: payment.description
      }]
    }
  }

  async refundSale(saleId: string, refundRequest: { amount?: { total: string, currency: string } }) {
    await this.delay(120)
    return {
      id: `REF-${this.generateId().toUpperCase()}`,
      state: 'completed',
      amount: refundRequest.amount,
      sale_id: saleId,
      create_time: new Date().toISOString()
    }
  }

  async lookupPayment(paymentId: string) {
    await this.delay(80)
    return {
      id: paymentId,
      state: 'approved',
      create_time: new Date().toISOString(),
      transactions: [{
        amount: { total: '10.00', currency: 'USD' }
      }]
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 15)
  }
}

// Square-like API
class SquareAPI {
  async chargeCustomer(request: {
    amount_money: { amount: number, currency: string }
    source_id: string
    note?: string
  }) {
    await this.delay(130)
    const paymentId = this.generateId()

    return {
      payment: {
        id: paymentId,
        status: 'COMPLETED',
        amount_money: request.amount_money,
        source_type: 'CARD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  async refundPayment(paymentId: string, refund: {
    amount_money?: { amount: number, currency: string }
    reason?: string
  }) {
    await this.delay(110)
    return {
      refund: {
        id: this.generateId(),
        status: 'COMPLETED',
        amount_money: refund.amount_money,
        payment_id: paymentId,
        created_at: new Date().toISOString()
      }
    }
  }

  async getPayment(paymentId: string) {
    await this.delay(60)
    return {
      payment: {
        id: paymentId,
        status: 'COMPLETED',
        amount_money: { amount: 1000, currency: 'USD' },
        created_at: new Date().toISOString()
      }
    }
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 15)
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================================================
// Adapter Classes - Bridge between third-party APIs and our interface
// =============================================================================

class StripeAdapter implements PaymentProcessor {
  constructor(private stripeAPI: StripeAPI) { }

  async processPayment(amount: number, currency: string, paymentMethod: string): Promise<PaymentResult> {
    try {
      // Convert dollars to cents for Stripe
      const amountInCents = Math.round(amount * 100)

      const charge = await this.stripeAPI.createCharge({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        source: paymentMethod,
        description: `Payment of ${amount} ${currency.toUpperCase()}`
      })

      return {
        success: charge.status === 'succeeded',
        transactionId: charge.id,
        message: `Stripe payment ${charge.status}`,
        timestamp: new Date(charge.created * 1000)
      }
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: `Stripe payment failed: ${error}`,
        timestamp: new Date()
      }
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    try {
      const amountInCents = amount ? Math.round(amount * 100) : undefined
      const refund = await this.stripeAPI.createRefund(transactionId, amountInCents)

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to dollars
        message: `Stripe refund ${refund.status}`
      }
    } catch (error) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        message: `Stripe refund failed: ${error}`
      }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    const charge = await this.stripeAPI.retrieveCharge(transactionId)

    return {
      id: charge.id,
      status: this.mapStripeStatus(charge.status),
      amount: charge.amount / 100, // Convert back to dollars
      currency: charge.currency.toUpperCase()
    }
  }

  private mapStripeStatus(stripeStatus: string): TransactionStatus['status'] {
    switch (stripeStatus) {
      case 'pending': return 'pending'
      case 'succeeded': return 'completed'
      case 'failed': return 'failed'
      default: return 'failed'
    }
  }
}

class PayPalAdapter implements PaymentProcessor {
  constructor(private paypalAPI: PayPalAPI) { }

  async processPayment(amount: number, currency: string, paymentMethod: string): Promise<PaymentResult> {
    try {
      const payment = await this.paypalAPI.executePayment({
        total: amount.toFixed(2),
        currency: currency.toUpperCase(),
        payment_method: paymentMethod,
        description: `Payment of ${amount} ${currency.toUpperCase()}`
      })

      return {
        success: payment.state === 'approved',
        transactionId: payment.id,
        message: `PayPal payment ${payment.state}`,
        timestamp: new Date(payment.create_time)
      }
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: `PayPal payment failed: ${error}`,
        timestamp: new Date()
      }
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    try {
      const refundRequest = amount ? {
        amount: {
          total: amount.toFixed(2),
          currency: 'USD'
        }
      } : {}

      const refund = await this.paypalAPI.refundSale(transactionId, refundRequest)

      return {
        success: refund.state === 'completed',
        refundId: refund.id,
        amount: refund.amount ? parseFloat(refund.amount.total) : 0,
        message: `PayPal refund ${refund.state}`
      }
    } catch (error) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        message: `PayPal refund failed: ${error}`
      }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    const payment = await this.paypalAPI.lookupPayment(transactionId)

    return {
      id: payment.id,
      status: this.mapPayPalStatus(payment.state),
      amount: parseFloat(payment.transactions[0].amount.total),
      currency: payment.transactions[0].amount.currency
    }
  }

  private mapPayPalStatus(paypalStatus: string): TransactionStatus['status'] {
    switch (paypalStatus) {
      case 'created': return 'pending'
      case 'approved': return 'completed'
      case 'failed': return 'failed'
      default: return 'failed'
    }
  }
}

class SquareAdapter implements PaymentProcessor {
  constructor(private squareAPI: SquareAPI) { }

  async processPayment(amount: number, currency: string, paymentMethod: string): Promise<PaymentResult> {
    try {
      // Convert dollars to cents for Square
      const amountInCents = Math.round(amount * 100)

      const response = await this.squareAPI.chargeCustomer({
        amount_money: {
          amount: amountInCents,
          currency: currency.toUpperCase()
        },
        source_id: paymentMethod,
        note: `Payment of ${amount} ${currency.toUpperCase()}`
      })

      return {
        success: response.payment.status === 'COMPLETED',
        transactionId: response.payment.id,
        message: `Square payment ${response.payment.status}`,
        timestamp: new Date(response.payment.created_at)
      }
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: `Square payment failed: ${error}`,
        timestamp: new Date()
      }
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    try {
      const refundRequest = amount ? {
        amount_money: {
          amount: Math.round(amount * 100),
          currency: 'USD'
        },
        reason: 'Customer requested refund'
      } : { reason: 'Customer requested refund' }

      const response = await this.squareAPI.refundPayment(transactionId, refundRequest)

      return {
        success: response.refund.status === 'COMPLETED',
        refundId: response.refund.id,
        amount: response.refund.amount_money ? response.refund.amount_money.amount / 100 : 0,
        message: `Square refund ${response.refund.status}`
      }
    } catch (error) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        message: `Square refund failed: ${error}`
      }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    const response = await this.squareAPI.getPayment(transactionId)
    const payment = response.payment

    return {
      id: payment.id,
      status: this.mapSquareStatus(payment.status),
      amount: payment.amount_money.amount / 100, // Convert back to dollars
      currency: payment.amount_money.currency
    }
  }

  private mapSquareStatus(squareStatus: string): TransactionStatus['status'] {
    switch (squareStatus) {
      case 'PENDING': return 'pending'
      case 'COMPLETED': return 'completed'
      case 'FAILED': return 'failed'
      case 'CANCELED': return 'failed'
      default: return 'failed'
    }
  }
}

// =============================================================================
// Payment Context - Uses the adapter pattern
// =============================================================================

class PaymentContext {
  constructor(private processor: PaymentProcessor) { }

  async processPayment(amount: number, currency: string, paymentMethod: string): Promise<PaymentResult> {
    console.log(`Processing payment of ${amount} ${currency} using ${this.processor.constructor.name}`)
    return await this.processor.processPayment(amount, currency, paymentMethod)
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    console.log(`Processing refund for transaction ${transactionId} using ${this.processor.constructor.name}`)
    return await this.processor.refundPayment(transactionId, amount)
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return await this.processor.getTransactionStatus(transactionId)
  }

  // Allow switching payment processors at runtime
  setProcessor(processor: PaymentProcessor) {
    this.processor = processor
  }
}

// =============================================================================
// Demo Usage
// =============================================================================

async function demonstrateAdapterPattern() {
  console.log('='.repeat(80))
  console.log('PAYMENT ADAPTER PATTERN DEMONSTRATION')
  console.log('='.repeat(80))

  // Initialize third-party APIs
  const stripeAPI = new StripeAPI()
  const paypalAPI = new PayPalAPI()
  const squareAPI = new SquareAPI()

  // Create adapters
  const stripeAdapter = new StripeAdapter(stripeAPI)
  const paypalAdapter = new PayPalAdapter(paypalAPI)
  const squareAdapter = new SquareAdapter(squareAPI)

  // Create payment context
  const paymentContext = new PaymentContext(stripeAdapter)

  const testPayments = [
    { provider: 'Stripe', adapter: stripeAdapter },
    { provider: 'PayPal', adapter: paypalAdapter },
    { provider: 'Square', adapter: squareAdapter }
  ]

  for (const { provider, adapter } of testPayments) {
    console.log(`\n📱 Testing ${provider} Integration`)
    console.log('-'.repeat(40))

    // Switch to the current adapter
    paymentContext.setProcessor(adapter)

    try {
      // 1. Process payment
      const paymentResult = await paymentContext.processPayment(25.99, 'USD', 'card_token_123')
      console.log('💳 Payment Result:', {
        success: paymentResult.success,
        transactionId: paymentResult.transactionId,
        message: paymentResult.message
      })

      if (paymentResult.success) {
        // 2. Check transaction status
        const status = await paymentContext.getTransactionStatus(paymentResult.transactionId)
        console.log('📊 Transaction Status:', {
          status: status.status,
          amount: status.amount,
          currency: status.currency
        })

        // 3. Process partial refund
        const refundResult = await paymentContext.refundPayment(paymentResult.transactionId, 10.00)
        console.log('💰 Refund Result:', {
          success: refundResult.success,
          refundId: refundResult.refundId,
          amount: refundResult.amount,
          message: refundResult.message
        })
      }
    } catch (error) {
      console.error(`❌ Error with ${provider}:`, error)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('🎉 ADAPTER PATTERN BENEFITS DEMONSTRATED:')
  console.log('• Unified interface for different payment providers')
  console.log('• Easy to switch between providers at runtime')
  console.log('• New providers can be added without changing existing code')
  console.log('• Application code is decoupled from third-party APIs')
  console.log('='.repeat(80))
}

// =============================================================================
// Additional Demo: Factory + Adapter Pattern
// =============================================================================

class PaymentAdapterFactory {
  static createAdapter(provider: 'stripe' | 'paypal' | 'square'): PaymentProcessor {
    switch (provider) {
      case 'stripe':
        return new StripeAdapter(new StripeAPI())
      case 'paypal':
        return new PayPalAdapter(new PayPalAPI())
      case 'square':
        return new SquareAdapter(new SquareAPI())
      default:
        throw new Error(`Unsupported payment provider: ${provider}`)
    }
  }
}

async function demonstrateFactoryWithAdapter() {
  console.log('\n' + '='.repeat(80))
  console.log('FACTORY + ADAPTER PATTERN DEMONSTRATION')
  console.log('='.repeat(80))

  const providers: Array<'stripe' | 'paypal' | 'square'> = ['stripe', 'paypal', 'square']

  for (const providerName of providers) {
    console.log(`\n🏭 Creating ${providerName} adapter using factory...`)

    const adapter = PaymentAdapterFactory.createAdapter(providerName)
    const paymentContext = new PaymentContext(adapter)

    const result = await paymentContext.processPayment(15.50, 'USD', 'payment_method_456')
    console.log(`✅ ${providerName} payment:`, {
      success: result.success,
      transactionId: result.transactionId.substring(0, 20) + '...'
    })
  }
}

// Run the demonstrations
async function runDemo() {
  await demonstrateAdapterPattern()
  await demonstrateFactoryWithAdapter()
}

// Export for use in other modules
export {
  PaymentProcessor,
  PaymentResult,
  RefundResult,
  TransactionStatus,
  StripeAdapter,
  PayPalAdapter,
  SquareAdapter,
  PaymentContext,
  PaymentAdapterFactory,
  runDemo
}
