const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    JWT_SECRET,
  } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !JWT_SECRET) {
    return {
      statusCode: 500,
      body: "Missing server configuration",
    };
  }

  let password = null;
  try {
    const body = JSON.parse(event.body || "{}");
    password = body.password;
  } catch (err) {
    password = null;
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const token = jwt.sign(
    { email: ADMIN_EMAIL, codeHash: hashValue(code) },
    JWT_SECRET,
    { expiresIn: "10m" }
  );

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
    subject: "Admin login code",
    text: `Je login code is: ${code}\nDeze code is 10 minuten geldig.`,
    html: `<p>Je login code is: <strong>${code}</strong></p><p>Deze code is 10 minuten geldig.</p>`,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, token }),
  };
};
