enum PaymentType {
    CreditCard,
    Momo,
    BankTransfer,
    ZaloPay,
}

interface PaymentService {
    pay(amount: number): Promise<boolean>;
}

class CreditCardPaymentService implements PaymentService {
    async pay(amount: number): Promise<boolean> {
        console.log(`Processing credit card payment of ${amount}`);
        return true;
    }
}

class MomoPaymentService implements PaymentService {
    async pay(amount: number): Promise<boolean> {
        console.log(`Processing Momo payment of ${amount}`);
        return true;
    }
}

class BankTransferPaymentService implements PaymentService {
    async pay(amount: number): Promise<boolean> {
        console.log(`Processing bank transfer payment of ${amount}`);
        return true;
    }
}

class ZaloPayPaymentService implements PaymentService {
    async pay(amount: number): Promise<boolean> {
        console.log(`Processing ZaloPay payment of ${amount}`);
        return true;
    }
}

class PaymentServiceFactory {
    static createPaymentService(type: PaymentType): PaymentService {
        switch (type) {
            case PaymentType.CreditCard:
                return new CreditCardPaymentService();
            case PaymentType.Momo:
                return new MomoPaymentService();
            case PaymentType.BankTransfer:
                return new BankTransferPaymentService();
            case PaymentType.ZaloPay:
                return new ZaloPayPaymentService();
            default:
                throw new Error("Unsupported payment type");
        }
    }
}

// Example usage
async function processPayment(type: PaymentType, amount: number) {
    const paymentService = PaymentServiceFactory.createPaymentService(type);
    const result = await paymentService.pay(amount);
    console.log(`Payment successful: ${result}`);
}

processPayment(PaymentType.CreditCard, 100)
    .then(() => console.log("Payment processed"))
    .catch(err => console.error("Payment failed:", err));
processPayment(PaymentType.Momo, 50)
    .then(() => console.log("Payment processed"))
    .catch(err => console.error("Payment failed:", err));