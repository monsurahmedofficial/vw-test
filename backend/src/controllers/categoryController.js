const { pool } = require('../config/db');

async function getCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function createCategory(req, res) {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, color) VALUES (?, ?)',
      [name.trim(), color || 'blue']
    );
    res.status(201).json({ id: result.insertId, name: name.trim(), color: color || 'blue' });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ message: 'Category already exists' });
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateCategory(req, res) {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
  try {
    await pool.query('UPDATE categories SET name = ?, color = ? WHERE id = ?', [name.trim(), color || 'blue', req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteCategory(req, res) {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
