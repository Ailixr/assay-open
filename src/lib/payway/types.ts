export interface PayWayConfig {
  merchantId: string;
  apiKey: string;
  baseUrl: string;
}

export interface CreatePaymentLinkRequest {
  title: string;
  amount: string;
  currency: "USD" | "KHR";
  description?: string;
  merchant_ref_no: string;
  return_url: string;
  payment_limit?: number;
  expired_date?: number;
  payout?: PayoutSplit[];
}

export interface PayoutSplit {
  acc: string;
  amt: string;
  acc_name: string;
}

export interface PaymentLinkResponse {
  data: {
    id: string;
    title: string;
    amount: string;
    currency: string;
    status: "OPEN" | "CLOSED" | "EXPIRED";
    payment_link: string;
    merchant_ref_no: string;
    created_at: string;
    expired_date: number;
    payout: PayoutSplit[];
  };
  status: { code: string; message: string };
  tran_id: number;
}

export interface PayWayWebhookPayload {
  transaction_id: string;
  transaction_date: string;
  original_currency: string;
  original_amount: number;
  bank_ref: string;
  apv: string;
  payment_status_code: number;
  payment_status: string;
  payment_currency: string;
  payment_amount: number;
  payment_type: string;
  payer_account: string;
  bank_name: string;
  merchant_ref: string;
}

export interface RefundRequest {
  tran_id: string;
  amount?: string;
}

export interface TransactionDetailResponse {
  data: {
    transaction_id: string;
    payment_status_code: number;
    payment_status: string;
    original_amount: number;
    original_currency: string;
    payment_amount: number;
    payment_currency: string;
    total_amount: number;
    refund_amount: number;
    payment_type: string;
    payer_account: string;
    bank_name: string;
    transaction_date: string;
    transaction_operations: Array<{
      status: string;
      amount: number;
      transaction_date: string;
      bank_ref: string;
    }>;
  };
  status: { code: string; message: string };
}
