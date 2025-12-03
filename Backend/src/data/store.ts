import { Category, Item } from "../models/types";
import { db } from "./db";

export function loadCategories(): Category[] {
  const rows = db
    .prepare<never, Category>(`
      SELECT id, name, description, icon, color
      FROM categories
      ORDER BY id
    `)
    .all();
  return rows;
}

export function loadItems(): Item[] {
  const rows = db
    .prepare<never, Item>(`
      SELECT id, categoryId, title, subtitle, content, footer, imageUrl
      FROM items
      ORDER BY id
    `)
    .all();
  return rows;
}

export function saveCategories(categories: Category[]) {
  const tx = db.transaction((rows: Category[]) => {
    db.prepare(`DELETE FROM categories`).run();
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, description, icon, color)
      VALUES (@id, @name, @description, @icon, @color)
    `);
    for (const c of rows) {
      stmt.run({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        icon: c.icon ?? null,
        color: c.color ?? null,
      });
    }
  });
  tx(categories);
}

export function saveItems(items: Item[]) {
  const tx = db.transaction((rows: Item[]) => {
    db.prepare(`DELETE FROM items`).run();
    const stmt = db.prepare(`
      INSERT INTO items (id, categoryId, title, subtitle, content, footer, imageUrl)
      VALUES (@id, @categoryId, @title, @subtitle, @content, @footer, @imageUrl)
    `);
    for (const item of rows) {
      stmt.run({
        id: item.id,
        categoryId: item.categoryId,
        title: item.title,
        subtitle: item.subtitle ?? null,
        content: item.content ?? "",
        footer: item.footer ?? null,
        imageUrl: item.imageUrl ?? null,
      });
    }
  });
  tx(items);
}
