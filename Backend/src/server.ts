import express from "express";
import cors from "cors";
import categoriesRouter from "./routes/categories";
import itemsRouter from "./routes/items";
import printJobsRouter from "./routes/printJobs";
import printerSettingsRouter from "./routes/printerSettings";
import printersRouter from "./routes/printers";
import { initDb } from "./data/db";

// 初始化 SQLite 資料庫與資料表
initDb();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ["http://localhost:3000"],
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/categories", categoriesRouter);
app.use("/api/items", itemsRouter);
app.use("/api/print-jobs", printJobsRouter);
app.use("/api/printer-settings", printerSettingsRouter);
app.use("/api/printers", printersRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});


