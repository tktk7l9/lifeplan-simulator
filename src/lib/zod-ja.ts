import { z } from "zod";
import { ja } from "zod/locales";

// Validation messages are shown to the user, so they must be Japanese (SHIG 11, 55).
z.config(ja());
