/** Stub AuthService — จะ port ใน Phase 1.5 */
export class AuthService {
  isJwtTokenValid(): boolean { return false; }
  refreshJwtToken(): Promise<string> { return Promise.resolve(""); }
  logout(ignoreRequest?: boolean, captureLastUrl?: boolean): void {}
}
