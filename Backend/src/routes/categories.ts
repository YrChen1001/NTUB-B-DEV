import { Router } from "express";
import { Category, Item } from "../models/types";
import { loadCategories, loadItems, saveCategories, saveItems } from "../data/store";

const router = Router();

router.get("/", (_req, res) => {
  const categories = loadCategories();
  res.json(categories);
});

// Replace all categories (used by frontend bulk save)
router.put("/", (req, res) => {
  const body = req.body as Category[];
  if (!Array.isArray(body)) {
    return res.status(400).json({ message: "Expected an array of categories" });
  }
  saveCategories(body);
  res.json(body);
});

router.post("/", (req, res) => {
  const categories = loadCategories();
  const body = req.body as Partial<Category>;

  const newCategory: Category = {
    id: Date.now().toString(),
    name: body.name ?? "新類別",
    description: body.description ?? "",
    icon: body.icon,
    color: body.color ?? "bg-blue-600",
  };

  const updated = [...categories, newCategory];
  saveCategories(updated);
  res.status(201).json(newCategory);
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const categories = loadCategories();
  const body = req.body as Partial<Category>;

  const exists = categories.find((c) => c.id === id);
  if (!exists) {
    return res.status(404).json({ message: "Category not found" });
  }

  const updated = categories.map((c) =>
    c.id === id ? { ...c, ...body, id: c.id } : c
  );
  saveCategories(updated);
  res.json(updated.find((c) => c.id === id));
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const categories = loadCategories();
  const items = loadItems();

  const exists = categories.find((c) => c.id === id);
  if (!exists) {
    return res.status(404).json({ message: "Category not found" });
  }

  const updatedCategories = categories.filter((c) => c.id !== id);
  const updatedItems = items.filter((i) => i.categoryId !== id);

  saveCategories(updatedCategories);
  saveItems(updatedItems);

  res.status(204).send();
});

router.get("/:id/items", (req, res) => {
  const id = req.params.id;
  const items = loadItems();
  const filtered = items.filter((i) => i.categoryId === id);
  res.json(filtered);
});

export default router;


