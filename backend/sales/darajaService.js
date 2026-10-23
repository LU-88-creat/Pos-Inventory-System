import { timingSafeEqual } from "node:crypto";

const API_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

function getDarajaConfig() {
  const environment = process.env.MPESA_ENV || "sandbox";
  const config = {
    environment,
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    transactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
    callbackUrl: process.env.MPESA_CALLBACK_URL,
    callbackToken: process.env.MPESA_CALLBACK_TOKEN,
    accountReference: process.env.MPESA_ACCOUNT_REFERENCE || "POS Sale",
    transactionDescription:
      process.env.MPESA_TRANSACTION_DESC || "POS sale payment",
  };

  const missing = [
    ["MPESA_CONSUMER_KEY", config.consumerKey],
    ["MPESA_CONSUMER_SECRET", config.consumerSecret],
    ["MPESA_SHORTCODE", config.shortcode],
    ["MPESA_PASSKEY", config.passkey],
    ["MPESA_CALLBACK_URL", config.callbackUrl],
    ["MPESA_CALLBACK_TOKEN", config.callbackToken],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (!API_URLS[environment]) {
    throw new Error("MPESA_ENV must be either sandbox or production.");
  }

  if (missing.length > 0) {
    throw new Error(`M-Pesa configuration is incomplete: ${missing.join(", ")}.`);
  }

  if (Buffer.byteLength(config.callbackToken) < 32) {
    throw new Error("MPESA_CALLBACK_TOKEN must contain at least 32 characters.");
  }

  let callbackUrl;
  try {
    callbackUrl = new URL(config.callbackUrl);
  } catch {
    throw new Error("MPESA_CALLBACK_URL must be a valid public HTTPS URL.");
  }

  if (callbackUrl.protocol !== "https:") {
    throw new Error("MPESA_CALLBACK_URL must use HTTPS.");
  }

  callbackUrl.searchParams.set("token", config.callbackToken);

  return {
    ...config,
    baseUrl: API_URLS[environment],
    callbackUrl: callbackUrl.toString(),
  };
}

export function validateDarajaConfig() {
  getDarajaConfig();
}

async function readDarajaResponse(response, stage) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      payload.errorMessage ||
      payload.error_description ||
      payload.ResponseDescription ||
      `Daraja request failed (${response.status}).`;
    const error = new Error(detail);
    error.definitive = true;
    error.stage = stage;
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function getAccessToken(config) {
  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");
  let response;
  try {
    response = await fetch(
      `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(15000),
      }
    );
  } catch (error) {
    error.stage = "OAuth token request";
    throw error;
  }
  const payload = await readDarajaResponse(response, "OAuth token request");

  if (!payload.access_token) {
    const error = new Error("Daraja did not return an access token.");
    error.definitive = true;
    error.stage = "OAuth token response";
    throw error;
  }

  return payload.access_token;
}

function getNairobiTimestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

export function normalizeKenyanPhoneNumber(value) {
  const digits = String(value ?? "").replace(/[\s()+-]/g, "");
  const normalized = digits.startsWith("0")
    ? `254${digits.slice(1)}`
    : digits;

  if (!/^254(?:7|1)\d{8}$/.test(normalized)) {
    throw new Error("Enter a valid Kenyan mobile number, for example 0712345678.");
  }

  return normalized;
}

export async function initiateStkPush({ phoneNumber, amount, saleId }) {
  const config = getDarajaConfig();
  let accessToken;
  try {
    accessToken = await getAccessToken(config);
  } catch (error) {
    error.paymentRequestSent = false;
    throw error;
  }

  const timestamp = getNairobiTimestamp();
  const password = Buffer.from(
    `${config.shortcode}${config.passkey}${timestamp}`
  ).toString("base64");
  let response;
  try {
    response = await fetch(
      `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: config.transactionType,
          Amount: Math.round(Number(amount)),
          PartyA: phoneNumber,
          PartyB: config.shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: config.callbackUrl,
          AccountReference: `${config.accountReference} ${saleId}`.slice(0, 12),
          TransactionDesc: config.transactionDescription.slice(0, 13),
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
  } catch (error) {
    error.paymentRequestSent = true;
    error.stage = "STK Push request";
    throw error;
  }

  let payload;
  try {
    payload = await readDarajaResponse(response, "STK Push request");
  } catch (error) {
    error.paymentRequestSent = true;
    error.stage ??= "STK Push response";
    throw error;
  }

  if (
    payload.ResponseCode !== "0" ||
    !payload.CheckoutRequestID ||
    !payload.MerchantRequestID
  ) {
    const error = new Error(
      payload.ResponseDescription || "Daraja did not accept the STK Push request."
    );
    error.definitive = payload.ResponseCode !== undefined && payload.ResponseCode !== "0";
    error.paymentRequestSent = true;
    error.stage = "STK Push response";
    throw error;
  }

  return {
    merchantRequestId: payload.MerchantRequestID,
    checkoutRequestId: payload.CheckoutRequestID,
    customerMessage: payload.CustomerMessage || "STK Push request sent.",
  };
}

export function isValidCallbackToken(receivedToken) {
  const expectedToken = process.env.MPESA_CALLBACK_TOKEN;
  if (!expectedToken || typeof receivedToken !== "string") return false;

  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);
  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}
