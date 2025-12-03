import { Router } from "express";
import { Item } from "../models/types";
import { loadItems, saveItems } from "../data/store";

const router = Router();

router.get("/", (_req, res) => {
  const items = loadItems();
  res.json(items);
});

// Replace all items (used by frontend bulk save)
router.put("/", (req, res) => {
  const body = req.body as Item[];
  if (!Array.isArray(body)) {
    return res.status(400).json({ message: "Expected an array of items" });
  }
  saveItems(body);
  res.json(body);
});

router.post("/", (req, res) => {
  const items = loadItems();
  const body = req.body as Partial<Item>;

  if (!body.categoryId) {
    return res.status(400).json({ message: "categoryId is required" });
  }

  const newItem: Item = {
    id: Date.now().toString(),
    categoryId: body.categoryId,
    title: body.title ?? "新項目",
    subtitle: body.subtitle,
    content: body.content ?? "",
    footer: body.footer,
    price: body.price,
    imageUrl: body.imageUrl,
  };

  const updated = [...items, newItem];
  saveItems(updated);
  res.status(201).json(newItem);
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const items = loadItems();
  const body = req.body as Partial<Item>;

  const exists = items.find((i) => i.id === id);
  if (!exists) {
    return res.status(404).json({ message: "Item not found" });
  }

  const updated = items.map((i) =>
    i.id === id ? { ...i, ...body, id: i.id } : i
  );
  saveItems(updated);
  res.json(updated.find((i) => i.id === id));
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const items = loadItems();

  const exists = items.find((i) => i.id === id);
  if (!exists) {
    return res.status(404).json({ message: "Item not found" });
  }

  const updated = items.filter((i) => i.id !== id);
  saveItems(updated);
  res.status(204).send();
});

export default router;


