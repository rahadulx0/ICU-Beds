import { Router } from 'express'
import { getModels } from '../db.js'
import { authenticate, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, requireActive, requireRole('admin'))

function sanitizeUser(row) {
  const user = row?.toJSON ? row.toJSON() : { ...row }
  if (user._id) {
    user.id = user._id.toString()
    delete user._id
  }
  if (user.assigned_hospitals) {
    user.assigned_hospitals = user.assigned_hospitals.map(id => id.toString())
  }
  delete user.password
  return user
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { User } = getModels()
    const users = await User.find().sort({ createdAt: -1 })
    res.json(users.map(sanitizeUser))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/users/:id/approve
router.put('/:id/approve', async (req, res) => {
  try {
    const { User } = getModels()
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const clean = sanitizeUser(user)
    req.app.get('io')?.emit('user:update', clean)
    res.json(clean)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { role, assigned_hospitals, status } = req.body
    const { User } = getModels()
    const updates = {}
    if (role) updates.role = role
    if (assigned_hospitals) updates.assigned_hospitals = assigned_hospitals
    if (status) updates.status = status

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const clean = sanitizeUser(user)
    req.app.get('io')?.emit('user:update', clean)
    res.json(clean)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { User } = getModels()
    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'User not found' })

    req.app.get('io')?.emit('user:delete', req.params.id)
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
