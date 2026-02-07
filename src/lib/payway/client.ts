import { generatePayWayHash, payWayTimestamp } from "./hash";
import type {
  PayWayConfig,
  CreatePaymentLinkRequest,
  PaymentLinkResponse,
  RefundRequest,
  TransactionDetailResponse,
} from "./types";

export class PayWayClient {
  private config: PayWayConfig;

  constructor(config?: Partial<PayWayConfig>) {
    this.config = {
      merchantId: config?.merchantId || process.env.PAYWAY_MERCHANT_ID || "",
      apiKey: config?.apiKey || process.env.PAYWAY_API_KEY || "",
      baseUrl: config?.baseUrl || process.env.PAYWAY_BASE_URL || "https://checkout-sandbox.payway.com.kh",
    };
    if (!this.config.merchantId || !this.config.apiKey) {
      throw new Error("PayWay merchant_id and api_key are required");
    }
  }

  async createPaymentLink(req: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> {
    const reqTime = payWayTimestamp();

    const params: Record<string, string> = {
      request_time: reqTime,
      merchant_id: this.config.merchantId,
      title: req.title,
      amount: req.amount,
      currency: req.currency,
      description: req.description || "",
      merchant_ref_no: req.merchant_ref_no,
      return_url: req.return_url,
      payment_limit: String(req.payment_limit || 1),
    };

    if (req.expired_date) params.expired_date = String(req.expired_date);
    if (req.payout) params.payout = JSON.stringify(req.payout);

    const merchantAuth = generatePayWayHash(this.config.apiKey, {
      request_time: reqTime,
      merchant_id: this.config.merchantId,
    });

    const formData = new FormData();
    formData.append("request_time", reqTime);
    formData.append("merchant_id", this.config.merchantId);
    formData.append("merchant_auth", merchantAuth);
    Object.entries(params).forEach(([k, v]) => {
      if (k !== "request_time" && k !== "merchant_id") formData.append(k, v);
    });
    formData.append("hash", generatePayWayHash(this.config.apiKey, params));

    const response = await fetch(
      `${this.config.baseUrl}/api/merchant-portal/merchant-access/payment-link/create`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PayWay API error (${response.status}): ${text}`);
    }
    return response.json();
  }

  async refund(req: RefundRequest): Promise<any> {
    const reqTime = payWayTimestamp();
    const merchantAuth = generatePayWayHash(this.config.apiKey, {
      request_time: reqTime,
      merchant_id: this.config.merchantId,
    });

    const body: Record<string, string> = {
      request_time: reqTime,
      merchant_id: this.config.merchantId,
      merchant_auth: merchantAuth,
      tran_id: req.tran_id,
    };
    if (req.amount) body.amount = req.amount;
    body.hash = generatePayWayHash(this.config.apiKey, body);

    const response = await fetch(
      `${this.config.baseUrl}/api/merchant-portal/merchant-access/online-transaction/refund`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PayWay refund error (${response.status}): ${text}`);
    }
    return response.json();
  }

  async checkTransaction(tranId: string): Promise<any> {
    const reqTime = payWayTimestamp();
    const body = {
      req_time: reqTime,
      merchant_id: this.config.merchantId,
      tran_id: tranId,
      hash: generatePayWayHash(this.config.apiKey, {
        req_time: reqTime,
        merchant_id: this.config.merchantId,
        tran_id: tranId,
      }),
    };

    const response = await fetch(
      `${this.config.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    return response.json();
  }

  async getTransactionDetail(tranId: string): Promise<TransactionDetailResponse> {
    const reqTime = payWayTimestamp();
    const body = {
      req_time: reqTime,
      merchant_id: this.config.merchantId,
      tran_id: tranId,
      hash: generatePayWayHash(this.config.apiKey, {
        req_time: reqTime,
        merchant_id: this.config.merchantId,
        tran_id: tranId,
      }),
    };

    const response = await fetch(
      `${this.config.baseUrl}/api/payment-gateway/v1/payments/transaction-detail`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    return response.json();
  }
}

let _client: PayWayClient | null = null;

export function getPayWayClient(): PayWayClient {
  if (!_client) _client = new PayWayClient();
  return _client;
}
