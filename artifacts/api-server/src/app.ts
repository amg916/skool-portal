import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";
import { generalApiLimit } from "./rateLimits.js";
import { errorHandler } from "./errors.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded PDFs
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api", generalApiLimit, router);

const PORTAL_DIST = process.env["PORTAL_DIST"]
  ? path.resolve(process.env["PORTAL_DIST"])
  : path.resolve(process.cwd(), "../portal/dist/public");

if (fs.existsSync(PORTAL_DIST)) {
  app.use(express.static(PORTAL_DIST, { maxAge: "1h", index: false }));
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res, next) => {
    const indexFile = path.join(PORTAL_DIST, "index.html");
    if (!fs.existsSync(indexFile)) return next();
    res.sendFile(indexFile);
  });
} else {
  logger.warn({ PORTAL_DIST }, "Portal dist not found — static SPA disabled");
}

app.use(errorHandler);

export default app;
