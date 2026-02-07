export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-sm font-medium text-red-600 tracking-wide">Ailixr</p>
        <h1 className="text-3xl font-bold text-gray-900">ASSAY</h1>
        <p className="text-gray-600">
          AI quality measurement via tips and disputes.
          <br />
          Powered by PayWay × KHQR.
        </p>
        <div className="pt-4 space-y-2 text-sm text-gray-400">
          <p><code>POST /api/invoices</code> → create invoice + payment link</p>
          <p><code>GET /api/health</code> → health check</p>
          <p><code>GET /api/export/dpo</code> → export training signals</p>
        </div>
      </div>
    </div>
  );
}
