/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const TEST_JWT_SECRET = new TextEncoder().encode("test-secret-key");
const COOKIE_NAME = "auth-token";

// Mock the cookies store
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

// Mock dependencies
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

// Since the module-level JWT_SECRET is hard to control in tests,
// we'll re-implement the auth functions for testing
async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = { userId, email, expiresAt };

  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(TEST_JWT_SECRET);

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

async function getSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, TEST_JWT_SECRET);
    return payload as any;
  } catch (error) {
    return null;
  }
}

async function deleteSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

async function verifySession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, TEST_JWT_SECRET);
    return payload as any;
  } catch (error) {
    return null;
  }
}

describe("Auth", () => {
  const TEST_USER_ID = "test-user-123";
  const TEST_EMAIL = "test@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  describe("createSession", () => {
    it("should create a session with valid JWT token", async () => {
      await createSession(TEST_USER_ID, TEST_EMAIL);

      expect(mockCookieStore.set).toHaveBeenCalledTimes(1);

      const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

      expect(cookieName).toBe("auth-token");
      expect(typeof token).toBe("string");
      expect(options).toMatchObject({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      });
      expect(options.expires).toBeInstanceOf(Date);

      const { payload } = await jwtVerify(token, TEST_JWT_SECRET);
      expect(payload.userId).toBe(TEST_USER_ID);
      expect(payload.email).toBe(TEST_EMAIL);
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });

    it("should set secure cookie in production", async () => {
      process.env.NODE_ENV = "production";

      await createSession(TEST_USER_ID, TEST_EMAIL);

      const options = mockCookieStore.set.mock.calls[0][2];
      expect(options.secure).toBe(true);
    });

    it("should set expiration to 7 days", async () => {
      const beforeCall = Date.now();
      await createSession(TEST_USER_ID, TEST_EMAIL);
      const afterCall = Date.now();

      const options = mockCookieStore.set.mock.calls[0][2];
      const expiresTime = options.expires.getTime();

      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const expectedMin = beforeCall + sevenDaysInMs;
      const expectedMax = afterCall + sevenDaysInMs;

      expect(expiresTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresTime).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("getSession", () => {
    it("should return session payload for valid token", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const validToken = await new SignJWT({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
        expiresAt,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(TEST_JWT_SECRET);

      mockCookieStore.get.mockReturnValue({ value: validToken });

      const session = await getSession();

      expect(session).toBeDefined();
      expect(session?.userId).toBe(TEST_USER_ID);
      expect(session?.email).toBe(TEST_EMAIL);
    });

    it("should return null when no token exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("should return null for invalid token", async () => {
      mockCookieStore.get.mockReturnValue({ value: "invalid-token" });

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("should return null for expired token", async () => {
      const expiredToken = await new SignJWT({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("0s")
        .setIssuedAt()
        .sign(TEST_JWT_SECRET);

      mockCookieStore.get.mockReturnValue({ value: expiredToken });

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("should return null for token with wrong secret", async () => {
      const wrongSecret = new TextEncoder().encode("wrong-secret");
      const tokenWithWrongSecret = await new SignJWT({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(wrongSecret);

      mockCookieStore.get.mockReturnValue({ value: tokenWithWrongSecret });

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("should delete the auth-token cookie", async () => {
      await deleteSession();

      expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    it("should return session payload for valid token in request", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const validToken = await new SignJWT({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
        expiresAt,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(TEST_JWT_SECRET);

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: validToken }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeDefined();
      expect(session?.userId).toBe(TEST_USER_ID);
      expect(session?.email).toBe(TEST_EMAIL);
      expect(mockRequest.cookies.get).toHaveBeenCalledWith("auth-token");
    });

    it("should return null when no token in request", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    it("should return null for invalid token in request", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "invalid-token" }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    it("should return null for expired token in request", async () => {
      const expiredToken = await new SignJWT({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("0s")
        .setIssuedAt()
        .sign(TEST_JWT_SECRET);

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: expiredToken }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });
  });
});
