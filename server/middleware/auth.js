import jwt from 'jsonwebtoken'
import { getDB } from '../db.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)
    const [rows] = await getDB().execute('SELECT * FROM users WHERE id = ?', [decoded.id])
    if (!rows.length) return res.status(401).json({ error: 'User not found' })

    const user = rows[0]
    user.assigned_hospitals = JSON.parse(user.assigned_hospitals || '[]')
    delete user.password
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export function requireActive(req, res, next) {
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'Account pending approval' })
  }
  next()
}
