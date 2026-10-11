import type { FieldValues, Resolver } from "react-hook-form";

type StepSchemas = typeof import("./schemas");
export type StepSchemaName = keyof StepSchemas["resolvers"];

let pending: Promise<StepSchemas> | undefined;

/**
 * Loads zod and the step schemas (./schemas) once; later calls share the same import. A failed
 * load (e.g. offline) is forgotten so the next validation tries again.
 */
export function loadStepSchemas(): Promise<StepSchemas> {
  pending ??= import("./schemas").catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

/**
 * React Hook Form resolver that fetches the step's zod schema on the form's first validation
 * instead of with the page, so zod stays out of the JavaScript needed for the first paint.
 * Validation is unchanged: it runs the same standardSchemaResolver the steps used inline.
 */
export function lazyResolver<T extends FieldValues>(name: StepSchemaName): Resolver<T> {
  return async (values, context, options) => {
    const { resolvers } = await loadStepSchemas();
    return (resolvers[name] as unknown as Resolver<T>)(values, context, options);
  };
}
