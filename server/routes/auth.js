import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getModels } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function sanitizeUser(userDoc) {
  const user = userDoc?.toJSON ? userDoc.toJSON() : { ...userDoc }
  if (user._id) {
    user.id = user._id.toString()
    delete user._id
  }
  if (user.assigned_hospitals) {
    user.assigned_hospitals = user.assigned_hospitals.map(id => id.toString())
  }
  delete user.password
  user.role = user.role || 'rep'
  return user
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, displayName } = req.body
    const { User } = getModels()

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const allowedRoles = ['rep', 'moderator', 'admin']
    const requestedRole = (role || '').toLowerCase().trim()
    const finalRole = allowedRoles.includes(requestedRole) ? requestedRole : 'rep'

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' })

    if (finalRole === 'admin') {
      const admins = await User.countDocuments({ role: 'admin' })
      if (admins >= 2) return res.status(400).json({ error: 'Maximum of 2 admin accounts allowed' })
    }

    // Auto-approval logic
    const adminCount = await User.countDocuments({ role: 'admin' })
    const totalCount = await User.countDocuments()
    const isFirstAdmin = finalRole === 'admin' && adminCount === 0
    const autoApprove = isFirstAdmin || totalCount === 0

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({
      email,
      password: hashed,
      displayName: displayName || email.split('@')[0],
      role: finalRole,
      status: autoApprove ? 'active' : 'pending',
      assigned_hospitals: [],
    })

    const clean = sanitizeUser(user)
    const token = signToken(clean.id)
    res.status(201).json({ token, user: clean })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const { User } = getModels()

    const user = await User.findOne({ email }).lean()
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait.' })
    }

    const clean = sanitizeUser(user)
    const token = signToken(clean.id)
    res.json({ token, user: clean })
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
    const { User } = getModels()

    const updates = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (phone !== undefined) updates.phone = phone
    if (organization !== undefined) updates.organization = organization

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true })
    res.json({ user: sanitizeUser(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const { User } = getModels()

    const user = await User.findById(req.user.id).select('password')
    const valid = user && await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })

    const hashed = await bcrypt.hash(newPassword, 12)
    await User.findByIdAndUpdate(req.user.id, { password: hashed })
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/auth/account
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body
    const { User } = getModels()

    const user = await User.findById(req.user.id).select('password')
    const valid = user && await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Incorrect password' })

    await User.findByIdAndDelete(req.user.id)
    res.json({ message: 'Account deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/admin-count
router.get('/admin-count', async (req, res) => {
  const { User } = getModels()
  const count = await User.countDocuments({ role: 'admin' })
  res.json({ count })
})

export default router
