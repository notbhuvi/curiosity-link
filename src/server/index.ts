import "dotenv/config";
import path from "node:path";
import express from "express";
import { app } from "./app.js";

const port = Number(process.env.PORT || 8080);
const isProduction = process.env.NODE_ENV === "production";
const clientDist = path.resolve(process.cwd(), "dist/client");

if (isProduction) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Curiosity Link server listening on ${port}`);
});
