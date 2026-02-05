const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { ADMIN_EMAIL, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !JWT_SECRET) {
    return { statusCode: 500, body: "Missing server configuration" };
  }

  let token = null;
  let code = null;
  try {
    const body = JSON.parse(event.body || "{}");
    token = body.token;
    code = body.code;
  } catch (err) {
    token = null;
    code = null;
  }

  if (!token || !code) {
    return { statusCode: 400, body: "Missing token or code" };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || payload.email !== ADMIN_EMAIL || !payload.codeHash) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    if (hashValue(String(code).trim()) !== payload.codeHash) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return { statusCode: 401, body: "Unauthorized" };
  }
};
