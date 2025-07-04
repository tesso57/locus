/**
 * Result type for error handling
 */
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Create a successful result
 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/**
 * Create an error result
 */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Check if a result is successful
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/**
 * Check if a result is an error
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/**
 * Map a successful result
 */
export const mapOk = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
};

/**
 * Map an error result
 */
export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> => {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
};

/**
 * Chain result operations
 */
export const andThen = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
};

/**
 * Provide a default value for errors
 */
export const unwrapOr = <T, E>(
  result: Result<T, E>,
  defaultValue: T,
): T => {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
};

/**
 * Convert Result to Promise
 */
export const toPromise = <T, E>(result: Result<T, E>): Promise<T> => {
  if (isOk(result)) {
    return Promise.resolve(result.value);
  }
  const error = result.error instanceof Error ? result.error : new Error(String(result.error));
  return Promise.reject(error);
};