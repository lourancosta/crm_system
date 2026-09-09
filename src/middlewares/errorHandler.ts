import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

type AppError = Error & {
  code?: string;
  sqlMessage?: string;
  statusCode?: number;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const appError = error as AppError;

  if (appError.code === "ER_DUP_ENTRY") {
    const constraint = appError.sqlMessage?.match(/for key '(?:[\w-]+\.)?([\w-]+)'/)?.[1];
    return res.status(409).json({
      message: constraint === "contacts_email_unique" ? "A contact with this email already exists" : "A unique constraint was violated",
    });
  }

  const status = appError.statusCode ?? 500;
  const message = appError.message ?? "Internal server error";

  res.status(status).json({ message });
};
