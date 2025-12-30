export default function ContactUs() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Contact Us</h1>

      <p className="text-slate-300">
        Need help? Our support team is here for you.
      </p>

      <div className="bg-white/5 rounded p-4 space-y-2">
        <p>📧 Email: <b>support@flyo.com</b></p>
        <p>🕒 Support Hours: 9 AM – 9 PM (IST)</p>
        <p>📞 Phone: +91-XXXXXXXXXX</p>
      </div>

      <p className="text-sm text-slate-400">
        Please check FAQs before contacting support for faster resolution.
      </p>
    </div>
  );
}
