/**
 * @module result
 *
 * Result type implementation for explicit error handling.
 *
 * This module provides a Result<T, E> type similar to Rust's Result type,
 * allowing for explicit error handling without exceptions. This pattern
 * makes error handling more predictable and type-safe.
 *
 * @example
 * ```typescript
 * import { ok, err, Result } from "./result.ts";
 *
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err("Division by zero");
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(`Result: ${result.value}`); // Result: 5
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 *
 * @since 0.1.0
 */

/**
 * Represents a successful result containing a value of type T.
 */
export type Ok<T> = { ok: true; value: T };

/**
 * Represents a failed result containing an error of type E.
 */
export type Err<E> = { ok: false; error: E };

/**
 * A Result is either Ok<T> or Err<E>.
 * By default, E is Error, but can be any type.
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Creates a successful Result containing the given value.
 *
 * @param value - The success value to wrap
 * @returns An Ok result containing the value
 *
 * @example
 * ```typescript
 * const result = ok(42);
 * console.log(result); // { ok: true, value: 42 }
 * ```
 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/**
 * Creates an error Result containing the given error.
 *
 * @param error - The error value to wrap
 * @returns An Err result containing the error
 *
 * @example
 * ```typescript
 * const result = err(new Error("Something went wrong"));
 * console.log(result); // { ok: false, error: Error(...) }
 * ```
 */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Type guard that checks if a Result is Ok (successful).
 *
 * @param result - The Result to check
 * @returns True if the result is Ok, false if it's Err
 *
 * @example
 * ```typescript
 * const result = ok("success");
 * if (isOk(result)) {
 *   console.log(result.value); // TypeScript knows result.value exists
 * }
 * ```
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/**
 * Type guard that checks if a Result is Err (error).
 *
 * @param result - The Result to check
 * @returns True if the result is Err, false if it's Ok
 *
 * @example
 * ```typescript
 * const result = err("failure");
 * if (isErr(result)) {
 *   console.error(result.error); // TypeScript knows result.error exists
 * }
 * ```
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/**
 * Maps the value of an Ok result using the provided function.
 * If the result is Err, returns it unchanged.
 *
 * @param result - The Result to map
 * @param fn - Function to transform the Ok value
 * @returns A new Result with the transformed value or the original error
 *
 * @example
 * ```typescript
 * const result = ok(5);
 * const doubled = mapOk(result, x => x * 2);
 * // doubled is ok(10)
 *
 * const error = err("error");
 * const stillError = mapOk(error, x => x * 2);
 * // stillError is err("error")
 * ```
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
 * Maps the error of an Err result using the provided function.
 * If the result is Ok, returns it unchanged.
 *
 * @param result - The Result to map
 * @param fn - Function to transform the Err value
 * @returns A new Result with the original value or transformed error
 *
 * @example
 * ```typescript
 * const result = err("not found");
 * const withError = mapErr(result, e => new Error(e));
 * // withError is err(Error("not found"))
 * ```
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
 * Chains Result-returning operations together (flatMap for Result).
 * If the result is Ok, applies the function to the value.
 * If the result is Err, returns it unchanged.
 *
 * @param result - The Result to chain from
 * @param fn - Function that takes the Ok value and returns a new Result
 * @returns The Result from fn if original was Ok, or the original Err
 *
 * @example
 * ```typescript
 * function parseNumber(s: string): Result<number, string> {
 *   const n = parseInt(s, 10);
 *   return isNaN(n) ? err("Not a number") : ok(n);
 * }
 *
 * function checkPositive(n: number): Result<number, string> {
 *   return n > 0 ? ok(n) : err("Not positive");
 * }
 *
 * const result = andThen(parseNumber("42"), checkPositive);
 * // result is ok(42)
 * ```
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
 * Extracts the value from an Ok result, or returns the default value if Err.
 *
 * @param result - The Result to unwrap
 * @param defaultValue - Value to return if the Result is Err
 * @returns The Ok value or the default value
 *
 * @example
 * ```typescript
 * const okResult = ok(42);
 * const errResult = err("error");
 *
 * console.log(unwrapOr(okResult, 0));  // 42
 * console.log(unwrapOr(errResult, 0)); // 0
 * ```
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
 * Converts a Result to a Promise.
 * Ok results become resolved promises, Err results become rejected promises.
 *
 * @param result - The Result to convert
 * @returns A Promise that resolves with the Ok value or rejects with the error
 *
 * @example
 * ```typescript
 * const okResult = ok("success");
 * const errResult = err(new Error("failure"));
 *
 * await toPromise(okResult);  // "success"
 * await toPromise(errResult); // throws Error("failure")
 * ```
 */
export const toPromise = <T, E>(result: Result<T, E>): Promise<T> => {
  if (isOk(result)) {
    return Promise.resolve(result.value);
  }
  const error = result.error instanceof Error ? result.error : new Error(String(result.error));
  return Promise.reject(error);
};
