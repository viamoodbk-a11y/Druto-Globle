-- Create a table to store payment/transaction history for subscriptions
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Amount in paise (₹229 = 22900)
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method TEXT, -- card, upi, netbanking, wallet
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_invoice_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_history
CREATE POLICY "Users can view own payment history"
  ON public.payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment history"
  ON public.payment_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_subscription_id ON public.payment_history(subscription_id);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();