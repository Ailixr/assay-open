"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PublicInvoice = {
  id: string;
  task_description: string;
  base_cost: number;
  currency: string;
  line_items: { description: string; amount: number }[];
  status: string;
  tip_amount: number;
  rating: number | null;
  rating_comment: string | null;
  payway_payment_link: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  expires_at: string | null;
};

const TIP_OPTIONS = [
  { label: "No tip", value: 0 },
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipOption, setTipOption] = useState<number>(0);
  const [customTipPercent, setCustomTipPercent] = useState<string>("");
  const [rating, setRating] = useState<number | "">("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/public/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Invoice not found" : "Failed to load");
        return res.json();
      })
      .then(setInvoice)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const tipPercent =
    tipOption === -1
      ? (parseFloat(customTipPercent) || 0) / 100
      : tipOption;
  const tipAmount = invoice ? invoice.base_cost * tipPercent : 0;
  const total = invoice ? invoice.base_cost + tipAmount : 0;

  const handleConfirmAndPay = async () => {
    if (!invoice || submitting) return;
    setPayError(null);
    setSubmitting(true);
    try {
      await fetch(`/api/invoices/${invoice.id}/tip-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tip_amount: Math.round(tipAmount * 100) / 100,
          rating: rating === "" ? undefined : rating,
          comment: comment.trim() || undefined,
        }),
      });
      const payRes = await fetch(`/api/invoices/${invoice.id}/create-payment`, {
        method: "POST",
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setPayError(payData.error === "already_paid" ? "Already paid" : payData.message || payData.error || "Failed to create payment");
        setSubmitting(false);
        return;
      }
      if (payData.payment_link) {
        window.location.href = payData.payment_link;
        return;
      }
      setPayError("No payment link returned");
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-stone-500">Loading invoice…</div>
      </div>
    );
  }
  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow border border-stone-200 p-6 text-center">
          <p className="text-red-600 font-medium">{error || "Invoice not found"}</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === "paid" || invoice.status === "rated";
  const isExpired = invoice.expires_at && new Date(invoice.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Assay</p>
          <h1 className="text-lg font-semibold text-stone-900 mt-1">Invoice</h1>
          <p className="text-sm text-stone-500 mt-0.5 truncate">{invoice.task_description}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm text-stone-500">Amount</p>
            <p className="text-2xl font-semibold text-stone-900">
              {invoice.currency} {invoice.base_cost.toFixed(2)}
            </p>
          </div>

          {invoice.line_items?.length > 0 && (
            <ul className="text-sm text-stone-600 space-y-1">
              {invoice.line_items.map((item, i) => (
                <li key={i}>
                  {item.description} — {invoice.currency} {item.amount.toFixed(2)}
                </li>
              ))}
            </ul>
          )}

          {isPaid ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="font-medium text-green-800">Thank you — paid</p>
              {invoice.paid_amount != null && (
                <p className="text-sm text-green-700 mt-1">
                  Paid: {invoice.currency} {invoice.paid_amount.toFixed(2)}
                </p>
              )}
            </div>
          ) : isExpired ? (
            <p className="text-amber-700 text-sm">This invoice has expired.</p>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-stone-700 mb-2">Tip</p>
                <div className="flex flex-wrap gap-2">
                  {TIP_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTipOption(opt.value);
                        setCustomTipPercent("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        tipOption === opt.value && !customTipPercent
                          ? "bg-amber-100 border-amber-400 text-amber-900"
                          : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="Custom %"
                    value={customTipPercent}
                    onChange={(e) => {
                      setCustomTipPercent(e.target.value);
                      setTipOption(-1);
                    }}
                    className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                {tipAmount > 0 && (
                  <p className="text-sm text-stone-500 mt-1">
                    Tip: {invoice.currency} {tipAmount.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-stone-700 mb-2">Feedback (optional)</p>
                <div className="flex gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(rating === n ? "" : n)}
                      className={`w-9 h-9 rounded-full text-sm font-medium border ${
                        rating === n ? "bg-amber-100 border-amber-400 text-amber-900" : "border-stone-300 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-xs text-stone-500 self-center ml-1">1–5</span>
                </div>
                <textarea
                  placeholder="Comment (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <div className="pt-2">
                <p className="text-sm text-stone-600">
                  Total: <span className="font-semibold text-stone-900">{invoice.currency} {total.toFixed(2)}</span>
                </p>
                <button
                  type="button"
                  onClick={handleConfirmAndPay}
                  disabled={submitting}
                  className="mt-3 w-full py-3 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? "Creating payment…" : "Confirm & pay with ABA"}
                </button>
                {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
