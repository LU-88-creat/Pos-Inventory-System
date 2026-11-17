
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const caPath = process.env.DB_SSL_CA_PATH;

if (caPath) {
  const resolvedCaPath = path.isAbsolute(caPath)
    ? caPath
    : path.resolve(__dirname, "..", caPath);

  try {
    dbConfig.ssl = {
      ca: fs.readFileSync(resolvedCaPath),
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    };
  } catch (error) {
    console.error(
      `Database TLS certificate not found at ${resolvedCaPath}:`,
      error.message
    );
  }
} else {
  dbConfig.ssl = {
    minVersion: "TLSv1.2",
  };
}

const db = mysql.createPool(dbConfig);

export default db;
