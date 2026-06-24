import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "remitask_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isAuthRequired() {
  return Boolean(process.env.APP_PASSWORD);
}

export function requestIsAuthenticated(request: NextRequest) {
  if (!isAuthRequired()) return true;
  return isValidSessionToken(request.cookies.get(COOKIE_NAME)?.value);
}

export function verifyPassword(password: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true;
  return secureCompare(password, expected);
}

export function setSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

function createSessionToken() {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${sign(issuedAt)}`;
}

function isValidSessionToken(token = "") {
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature || !secureCompare(signature, sign(issuedAt))) {
    return false;
  }

  const ageMs = Date.now() - Number(issuedAt);
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= SESSION_MAX_AGE_SECONDS * 1000;
}

function sign(value: string) {
  const secret = process.env.APP_PASSWORD || "";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function secureCompare(left: string, right: string) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}
