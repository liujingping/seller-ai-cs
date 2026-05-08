import type { Env } from "./types";

const PDD_API_URL = "https://gw-api.pinduoduo.com/api/router";

// Pinduoduo API signature: MD5(client_secret + sorted key-value pairs + client_secret).toUpperCase()
async function sign(
  params: Record<string, string>,
  clientSecret: string
): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  const raw = clientSecret + sorted + clientSecret;
  return (await md5Hex(raw)).toUpperCase();
}

// MD5 hash using Web Crypto API (Cloudflare Workers compatible)
async function md5Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Send a text message to the buyer via Pinduoduo API
export async function sendMessage(
  uid: string,
  text: string,
  env: Env
): Promise<void> {
  const params: Record<string, string> = {
    type: "pdd.mall.customer.service.send",
    client_id: env.PDD_CLIENT_ID,
    access_token: env.PDD_ACCESS_TOKEN,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    data_type: "JSON",
    session_id: uid,
    message_type: "1", // text message
    content: JSON.stringify({ text }),
  };

  params.sign = await sign(params, env.PDD_CLIENT_SECRET);

  const resp = await fetch(PDD_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("PDD API error:", resp.status, err);
  } else {
    const result = await resp.json();
    console.log("PDD send result:", JSON.stringify(result));
  }
}

// Verify the webhook signature from Pinduoduo
export async function verifySign(
  body: Record<string, unknown>,
  clientSecret: string
): Promise<boolean> {
  const receivedSign = body.sign as string;
  if (!receivedSign) return false;

  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k !== "sign") params[k] = String(v);
  }

  const expected = await sign(params, clientSecret);
  return expected === receivedSign;
}
