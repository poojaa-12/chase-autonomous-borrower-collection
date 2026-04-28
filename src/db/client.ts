import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://placeholder:placeholder@localhost:5432/placeholder";

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
