import type Joi from "joi"
import type { ValidationResultError, ValidationResultSuccess } from "../../domain"

export function mapJoiResult<T>(
  value: T,
  vr: Joi.ValidationResult<T>,
): ValidationResultSuccess<T> | ValidationResultError<T> {
  if (typeof vr.error !== "undefined") {
    return mapJoiError(value, vr.error)
  }
  return {
    status: "success",
    value: vr.value,
  }
}

export function mapJoiError<T>(value: T, error: Joi.ValidationError) {
  const result: ValidationResultError<T> = {
    status: "error",
    error: error.message,
    value,
    children: {},
  }
  error.details.forEach(err => {
    let current = result as ValidationResultError<any>
    err.path.forEach(path => {
      const next: ValidationResultError<any> = {
        status: "error",
        error: err.message,
        value: err.context?.value,
        children: {},
      }
      if (current.children[path] !== undefined && (current.children[path] as any).children !== undefined) {
        next.children = (current.children[path] as any).children
      }
      current.children[path] = next
      current = next
    })
  })
  return result
}

export function isJoiError(err: unknown): err is Joi.ValidationError {
  return typeof err === "object" && err !== null && (err as Joi.ValidationError).isJoi
}
