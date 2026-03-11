import { Router } from 'express'
import { getDB } from '../db.js'
import { authenticate, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, requireActive, requireRole('admin'))

function sanitizeUser(row) {
  const user = { ...row }
  delete user.password
  user.assigned_hospitals = JSON.parse(user.assigned_hospitals || '[]')
  return user
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const [rows] = await getDB().execute('SELECT * FROM users ORDER BY createdAt DESC')
    res.json(rows.map(sanitizeUser))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/users/:id/approve
router.put('/:id/approve', async (req, res) => {
  try {
    const db = getDB()
    await db.execute("UPDATE users SET status = 'active' WHERE id = ?", [req.params.id])
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })

    const user = sanitizeUser(rows[0])
    req.app.get('io')?.emit('user:update', user)
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDB()
    const { role, assigned_hospitals, status } = req.body
    const sets = []
    const vals = []

    if (role) { sets.push('role = ?'); vals.push(role) }
    if (assigned_hospitals) { sets.push('assigned_hospitals = ?'); vals.push(JSON.stringify(assigned_hospitals)) }
    if (status) { sets.push('status = ?'); vals.push(status) }

    if (sets.length) {
      vals.push(req.params.id)
      await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals)
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })

    const user = sanitizeUser(rows[0])
    req.app.get('io')?.emit('user:update', user)
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await getDB().execute('DELETE FROM users WHERE id = ?', [req.params.id])
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found' })

    req.app.get('io')?.emit('user:delete', parseInt(req.params.id))
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
