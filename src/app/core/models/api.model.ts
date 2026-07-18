/** Uniform async result so UIs can react without try/catch and show messages. */
export interface ApiResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
