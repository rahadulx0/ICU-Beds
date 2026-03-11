import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getDB } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function sanitizeUser(row) {
  const user = { ...row }
  delete user.password
  user.assigned_hospitals = JSON.parse(user.assigned_hospitals || '[]')
  return user
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, displayName } = req.body
    const db = getDB()

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length) return res.status(409).json({ error: 'An account with this email already exists' })

    if (role === 'admin') {
      const [admins] = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'")
      if (admins[0].cnt >= 2) return res.status(400).json({ error: 'Maximum of 2 admin accounts allowed' })
    }

    // Auto-approval logic
    const [adminRows] = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'")
    const [totalRows] = await db.execute('SELECT COUNT(*) as cnt FROM users')
    const isFirstAdmin = role === 'admin' && adminRows[0].cnt === 0
    const autoApprove = isFirstAdmin || totalRows[0].cnt === 0

    const hashed = await bcrypt.hash(password, 12)
    const [result] = await db.execute(
      'INSERT INTO users (email, password, displayName, role, status) VALUES (?, ?, ?, ?, ?)',
      [email, hashed, displayName || email.split('@')[0], role || 'rep', autoApprove ? 'active' : 'pending']
    )

    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId])
    const user = sanitizeUser(rows[0])
    const token = signToken(user.id)
    res.status(201).json({ token, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const db = getDB()

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email])
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' })

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait.' })
    }

    const token = signToken(user.id)
    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { displayName, phone, organization } = req.body
    const db = getDB()
    const sets = []
    const vals = []

    if (displayName !== undefined) { sets.push('displayName = ?'); vals.push(displayName) }
    if (phone !== undefined) { sets.push('phone = ?'); vals.push(phone) }
    if (organization !== undefined) { sets.push('organization = ?'); vals.push(organization) }

    if (sets.length) {
      vals.push(req.user.id)
      await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals)
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    res.json({ user: sanitizeUser(rows[0]) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const db = getDB()

    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id])
    const valid = await bcrypt.compare(currentPassword, rows[0].password)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })

    const hashed = await bcrypt.hash(newPassword, 12)
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id])
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/auth/account
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body
    const db = getDB()

    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id])
    const valid = await bcrypt.compare(password, rows[0].password)
    if (!valid) return res.status(401).json({ error: 'Incorrect password' })

    await db.execute('DELETE FROM users WHERE id = ?', [req.user.id])
    res.json({ message: 'Account deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/admin-count
router.get('/admin-count', async (req, res) => {
  const [rows] = await getDB().execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
  res.json({ count: rows[0].count })
})

export default router
