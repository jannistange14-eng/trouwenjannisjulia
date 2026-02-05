const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const {
    ADMIN_EMAIL,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    JWT_SECRET,
    SITE_URL,
  } = process.env;

  if (!ADMIN_EMAIL || !SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !JWT_SECRET || !SITE_URL) {
    return {
      statusCode: 500,
      body: "Missing server configuration",
    };
  }

  const token = jwt.sign({ email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: "10m" });
  const link = `${SITE_URL}/?token=${encodeURIComponent(token)}`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `Wedding Site <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: "Bevestig admin login",
    text: `Klik om in te loggen: ${link}\nDeze link is 10 minuten geldig.`,
    html: `<p>Klik om in te loggen:</p><p><a href="${link}">${link}</a></p><p>Deze link is 10 minuten geldig.</p>`,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
