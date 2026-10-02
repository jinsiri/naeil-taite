// Node's test runner does not resolve the extensionless TypeScript imports that Next.js supports.
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    // Server-only is a bundler boundary; these tests execute exclusively in Node.
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
