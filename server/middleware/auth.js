import jwt from 'jsonwebtoken'
import { getModels } from '../db.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)
    const { User } = getModels()
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ error: 'User not found' })

    req.user = user.toJSON()
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
