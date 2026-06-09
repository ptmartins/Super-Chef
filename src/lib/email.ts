import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, code: string) {
  const from = process.env.EMAIL_FROM || "Super Chef <noreply@superchef.com>";

  await transporter.sendMail({
    from,
    to,
    subject: "Your Super Chef password reset code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a1a1a;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#444;margin-bottom:16px;">
          We received a request to reset your Super Chef account password.
          Use the code below — it expires in <strong>15 minutes</strong>.
        </p>
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;
                    padding:20px;background:#f5f5f5;border-radius:10px;margin:24px 0;
                    color:#111;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;">
          If you didn't request a password reset you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Your Super Chef password reset code is: ${code}\n\nIt expires in 15 minutes. If you didn't request this, ignore the email.`,
  });
}
