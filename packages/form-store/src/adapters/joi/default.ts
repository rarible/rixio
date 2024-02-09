import type { ObjectSchema, ValidationOptions } from "joi"
import { mapJoiResult } from "./utils"

export function validateJoi<T extends object>(schema: ObjectSchema<T>, options: ValidationOptions = {}) {
  return (value: T) =>
    mapJoiResult(
      value,
      schema.validate(value, {
        abortEarly: false,
        stripUnknown: true,
        ...options,
      }),
    )
}
