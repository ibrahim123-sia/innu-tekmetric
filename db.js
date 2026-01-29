import { Pool } from "pg";
import "dotenv/config"; // Automatically loads .env

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

// Test connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Named export for the query function
export const query = (text, params) => pool.query(text, params);

// Named export for the pool itself
export { pool };

// Optional: Default export if you prefer importing it as a single object
export default {
  query: (text, params) => pool.query(text, params),
  pool,
};