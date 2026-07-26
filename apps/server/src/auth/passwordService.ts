import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.auth.bcryptRounds);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
