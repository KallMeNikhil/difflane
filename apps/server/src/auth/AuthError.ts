import type { AuthErrorPayload } from "@difflane/shared-types";

export class AuthError extends Error {
  readonly code: AuthErrorPayload["code"];
  readonly status: number;

  constructor(code: AuthErrorPayload["code"], message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
