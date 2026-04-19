declare module 'react-native-razorpay' {
    interface RazorpayOptions {
        key: string;
        subscription_id?: string;
        amount?: number;
        name: string;
        description: string;
        image?: string;
        prefill?: {
            name?: string;
            email?: string;
            contact?: string;
        };
        notes?: Record<string, string>;
        theme?: {
            color?: string;
        };
    }

    interface RazorpayResponse {
        razorpay_payment_id: string;
        razorpay_order_id?: string;
        razorpay_signature: string;
        razorpay_subscription_id?: string;
    }

    export default class RazorpayCheckout {
        static open(options: RazorpayOptions): Promise<RazorpayResponse>;
        static on(event: string, callback: (error: any) => void): void;
    }
}
