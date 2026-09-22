"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: 40 }}>
        <h1>COCOTRIBE</h1>
        <p>We’re temporarily unavailable. Please call +91 94966 69360.</p>
        <p lang="ml">
          താൽക്കാലികമായി ലഭ്യമല്ല. ദയവായി +91 94966 69360 എന്ന നമ്പറിൽ
          വിളിക്കുക.
        </p>
        <button onClick={reset}>Try again / വീണ്ടും ശ്രമിക്കുക</button>
      </body>
    </html>
  );
}
