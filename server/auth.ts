/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SECRET_FILE = path.join(DATA_DIR, '.auth_secret');
const BCRYPT_ROUNDS = 10;

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16) {
    return process.env.AUTH_SECRET.trim();
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const AUTH_SECRET = getAuthSecret();
const revokedTokenHashes = new Set<string>();

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function isBcryptHash(storedHash: string): boolean {
  return Boolean(storedHash && /^\$2[aby]\$\d{2}\$/.test(storedHash));
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  if (isBcryptHash(storedHash)) {
    try {
      return bcrypt.compareSync(password, storedHash);
    } catch {
      return false;
    }
  }
  // Backward-compatible verification for legacy scrypt hashes before migration/login upgrade
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, originalHex] = parts;
    if (!salt || !originalHex) return false;
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    const originalBuf = Buffer.from(originalHex, 'hex');
    if (derivedBuf.length !== originalBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, originalBuf);
  }
  return false;
}

export function needsRehash(storedHash: string): boolean {
  return !isBcryptHash(storedHash);
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  linkedStudentId?: string;
  tokenVersion?: number;
  iat: number;
  exp: number;
}

export function signAuthToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  ttlSeconds: number = 60 * 60 * 24 * 7
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    tokenVersion: payload.tokenVersion ?? 1,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const tokenDigest = crypto.createHash('sha256').update(token).digest('hex');
  if (revokedTokenHashes.has(tokenDigest)) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function revokeAuthToken(token: string): void {
  if (!token) return;
  const tokenDigest = crypto.createHash('sha256').update(token).digest('hex');
  revokedTokenHashes.add(tokenDigest);
}
