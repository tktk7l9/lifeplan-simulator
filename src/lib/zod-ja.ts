import { z } from "zod";
import { ja } from "zod/locales";

// Global Zod config for the simulator forms. The step schemas (components/simulator/steps/
// schemas.ts) import this module before they are built.

// Validation messages are shown to the user, so they must be Japanese (SHIG 11, 55).
z.config(ja());

// The production CSP has no 'unsafe-eval'. Zod's JIT probes for it with `new Function("")`, and
// the browser reports that probe as a CSP violation even though Zod catches the error, so the
// JIT is switched off; the interpreter is plenty fast for these small forms.
z.config({ jitless: true });
