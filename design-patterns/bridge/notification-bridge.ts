/**
 * Bridge Design Pattern Demo - Notification System
 * 
 * The Bridge pattern separates the abstraction (notification types) from 
 * their implementation (service providers), allowing both to vary independently.
 * 
 * Real-world scenario: A notification system that can send different types 
 * of notifications through various service providers without tight coupling.
 */

// Implementation interface - defines the interface for all service providers
interface NotificationProvider {
  send(recipient: string, subject: string, message: string): Promise<boolean>
  getProviderName(): string
}

// Concrete Implementation 1: AWS Service Provider
class AWSNotificationProvider implements NotificationProvider {
  async send(recipient: string, subject: string, message: string): Promise<boolean> {
    // Simulate AWS SES/SNS API call
    console.log(`🔶 AWS Provider: Sending notification`)
    console.log(`   To: ${recipient}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Message: ${message}`)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log(`✅ AWS: Notification sent successfully\n`)
    return true
  }

  getProviderName(): string {
    return 'AWS SES/SNS'
  }
}

// Concrete Implementation 2: Twilio Service Provider
class TwilioNotificationProvider implements NotificationProvider {
  async send(recipient: string, subject: string, message: string): Promise<boolean> {
    // Simulate Twilio API call
    console.log(`📱 Twilio Provider: Sending notification`)
    console.log(`   To: ${recipient}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Message: ${message}`)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150))
    console.log(`✅ Twilio: Notification sent successfully\n`)
    return true
  }

  getProviderName(): string {
    return 'Twilio'
  }
}

// Concrete Implementation 3: Firebase Service Provider
class FirebaseNotificationProvider implements NotificationProvider {
  async send(recipient: string, subject: string, message: string): Promise<boolean> {
    // Simulate Firebase Cloud Messaging API call
    console.log(`🔥 Firebase Provider: Sending notification`)
    console.log(`   To: ${recipient}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Message: ${message}`)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 80))
    console.log(`✅ Firebase: Notification sent successfully\n`)
    return true
  }

  getProviderName(): string {
    return 'Firebase Cloud Messaging'
  }
}

// Abstraction - Base notification class
abstract class Notification {
  protected provider: NotificationProvider

  constructor(provider: NotificationProvider) {
    this.provider = provider
  }

  // Template method that uses the bridge to implementation
  async send(recipient: string, content: string): Promise<boolean> {
    const { subject, message } = this.formatMessage(content)
    console.log(`📨 ${this.getNotificationType()} via ${this.provider.getProviderName()}`)
    return await this.provider.send(recipient, subject, message)
  }

  // Abstract methods to be implemented by refined abstractions
  abstract getNotificationType(): string
  abstract formatMessage(content: string): { subject: string; message: string }

  // Method to switch provider at runtime (demonstrates flexibility)
  setProvider(provider: NotificationProvider): void {
    this.provider = provider
    console.log(`🔄 Provider switched to: ${provider.getProviderName()}`)
  }
}

// Refined Abstraction 1: Email Notification
class EmailNotification extends Notification {
  getNotificationType(): string {
    return 'Email Notification'
  }

  formatMessage(content: string): { subject: string; message: string } {
    return {
      subject: `Important Update`,
      message: `
Dear User,

${content}

Best regards,
The Team

---
This is an automated email. Please do not reply.
			`.trim()
    }
  }
}

// Refined Abstraction 2: SMS Notification
class SMSNotification extends Notification {
  getNotificationType(): string {
    return 'SMS Notification'
  }

  formatMessage(content: string): { subject: string; message: string } {
    // SMS doesn't need subject, but we include it for interface consistency
    return {
      subject: 'SMS Alert',
      message: `ALERT: ${content.substring(0, 140)}` // SMS character limit
    }
  }
}

// Refined Abstraction 3: Push Notification
class PushNotification extends Notification {
  getNotificationType(): string {
    return 'Push Notification'
  }

  formatMessage(content: string): { subject: string; message: string } {
    return {
      subject: '🔔 App Notification',
      message: content.substring(0, 100) // Push notification character limit
    }
  }
}

// Enhanced Refined Abstraction: Priority Email with retry logic
class PriorityEmailNotification extends EmailNotification {
  private maxRetries: number = 3

  constructor(provider: NotificationProvider, maxRetries: number = 3) {
    super(provider)
    this.maxRetries = maxRetries
  }

  async send(recipient: string, content: string): Promise<boolean> {
    console.log(`🚨 PRIORITY EMAIL - Will retry up to ${this.maxRetries} times`)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${this.maxRetries}`)
        const success = await super.send(recipient, content)
        if (success) {
          console.log(`✅ Priority email sent successfully on attempt ${attempt}\n`)
          return true
        }
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed: ${error}`)
        if (attempt === this.maxRetries) {
          console.log(`💥 All ${this.maxRetries} attempts failed\n`)
          return false
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    return false
  }

  getNotificationType(): string {
    return 'Priority Email Notification'
  }
}

// Demo function to showcase the Bridge pattern
async function bridgePatternDemo(): Promise<void> {
  console.log('🌉 BRIDGE DESIGN PATTERN DEMO - Notification System\n')
  console.log('='.repeat(60) + '\n')

  // Create different service providers (implementations)
  const awsProvider = new AWSNotificationProvider()
  const twilioProvider = new TwilioNotificationProvider()
  const firebaseProvider = new FirebaseNotificationProvider()

  // Create different notification types (abstractions)
  const emailNotification = new EmailNotification(awsProvider)
  const smsNotification = new SMSNotification(twilioProvider)
  const pushNotification = new PushNotification(firebaseProvider)
  const priorityEmail = new PriorityEmailNotification(awsProvider, 2)

  const content = 'Your order #12345 has been processed and will be shipped within 24 hours.'
  const recipient = 'user@example.com'

  console.log('📱 SCENARIO 1: Different notification types with their preferred providers')
  console.log('-'.repeat(70))

  // Send notifications using different combinations
  await emailNotification.send(recipient, content)
  await smsNotification.send('+1234567890', content)
  await pushNotification.send('device_token_123', content)

  console.log('🔄 SCENARIO 2: Runtime provider switching (Bridge flexibility)')
  console.log('-'.repeat(70))

  // Demonstrate runtime provider switching
  console.log('Email notification switching from AWS to Firebase:')
  emailNotification.setProvider(firebaseProvider)
  await emailNotification.send(recipient, 'Provider switched successfully!')

  console.log('SMS notification switching from Twilio to AWS:')
  smsNotification.setProvider(awsProvider)
  await smsNotification.send('+1234567890', 'Now using AWS for SMS!')

  console.log('🚨 SCENARIO 3: Enhanced abstraction with additional features')
  console.log('-'.repeat(70))

  // Demonstrate enhanced abstraction
  await priorityEmail.send(recipient, 'This is a critical system alert!')

  console.log('🎯 SCENARIO 4: Mix and match - Same provider, different notifications')
  console.log('-'.repeat(70))

  // Use same provider for different notification types
  const universalProvider = new TwilioNotificationProvider()
  const emailViaTwilio = new EmailNotification(universalProvider)
  const pushViaTwilio = new PushNotification(universalProvider)

  await emailViaTwilio.send(recipient, 'Email sent through Twilio')
  await pushViaTwilio.send('device_token_456', 'Push sent through Twilio')

}

// Alternative example: Different UI themes with different rendering engines
abstract class UITheme {
  protected renderer: Renderer

  constructor(renderer: Renderer) {
    this.renderer = renderer
  }

  abstract render(component: string): void
}

interface Renderer {
  draw(element: string, style: object): void
  getRendererType(): string
}

class CanvasRenderer implements Renderer {
  draw(element: string, style: object): void {
    console.log(`🎨 Canvas: Drawing ${element} with style:`, style)
  }

  getRendererType(): string {
    return 'HTML5 Canvas'
  }
}

class SVGRenderer implements Renderer {
  draw(element: string, style: object): void {
    console.log(`📐 SVG: Rendering ${element} with style:`, style)
  }

  getRendererType(): string {
    return 'SVG'
  }
}

class DarkTheme extends UITheme {
  render(component: string): void {
    console.log(`🌙 Dark Theme rendering ${component}`)
    this.renderer.draw(component, {
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      border: '1px solid #333'
    })
  }
}

class LightTheme extends UITheme {
  render(component: string): void {
    console.log(`☀️ Light Theme rendering ${component}`)
    this.renderer.draw(component, {
      backgroundColor: '#ffffff',
      color: '#000000',
      border: '1px solid #ddd'
    })
  }
}

// Export for use in other modules
export {
  Notification,
  EmailNotification,
  SMSNotification,
  PushNotification,
  PriorityEmailNotification,
  NotificationProvider,
  AWSNotificationProvider,
  TwilioNotificationProvider,
  FirebaseNotificationProvider,
  UITheme,
  DarkTheme,
  LightTheme,
  Renderer,
  CanvasRenderer,
  SVGRenderer,
  bridgePatternDemo
}

// Run the demo if this file is executed directly
// To run this demo: npm run demo or npx tsx notification-bridge.ts
bridgePatternDemo().catch(console.error) 