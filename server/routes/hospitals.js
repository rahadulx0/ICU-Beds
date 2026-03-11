import { Router } from 'express'
import { getDB } from '../db.js'
import { authenticate, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

function formatHospital(row) {
  return {
    ...row,
    coordinates: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) },
  }
}

// GET /api/hospitals (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await getDB().execute('SELECT * FROM hospitals ORDER BY name')
    res.json(rows.map(formatHospital))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/hospitals (admin only)
router.post('/', authenticate, requireActive, requireRole('admin'), async (req, res) => {
  try {
    const db = getDB()
    const { name, address, coordinates, total_beds, available_beds } = req.body
    const lat = coordinates?.lat || 0
    const lng = coordinates?.lng || 0

    const [result] = await db.execute(
      'INSERT INTO hospitals (name, address, lat, lng, total_beds, available_beds, last_updated) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [name, address || '', lat, lng, total_beds || 0, available_beds || 0]
    )

    const [rows] = await db.execute('SELECT * FROM hospitals WHERE id = ?', [result.insertId])
    const hospital = formatHospital(rows[0])
    req.app.get('io')?.emit('hospital:create', hospital)
    res.status(201).json(hospital)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/hospitals/:id
router.put('/:id', authenticate, requireActive, async (req, res) => {
  try {
    const db = getDB()
    const [existing] = await db.execute('SELECT * FROM hospitals WHERE id = ?', [req.params.id])
    if (!existing.length) return res.status(404).json({ error: 'Hospital not found' })

    const hospital = existing[0]
    const { role, id: userId } = req.user
    const assignedIds = req.user.assigned_hospitals || []

    // Permission check
    if (role === 'admin') {
      // full access
    } else if (role === 'moderator') {
      if (!assignedIds.includes(hospital.id)) {
        return res.status(403).json({ error: 'Not assigned to this hospital' })
      }
    } else if (role === 'rep') {
      if (!assignedIds.includes(hospital.id) && hospital.assigned_rep_id !== userId) {
        return res.status(403).json({ error: 'Not assigned to this hospital' })
      }
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const b = req.body
    const sets = []
    const vals = []

    if (b.name !== undefined) { sets.push('name = ?'); vals.push(b.name) }
    if (b.address !== undefined) { sets.push('address = ?'); vals.push(b.address) }
    if (b.coordinates) {
      sets.push('lat = ?', 'lng = ?')
      vals.push(b.coordinates.lat || 0, b.coordinates.lng || 0)
    }
    if (b.total_beds !== undefined) { sets.push('total_beds = ?'); vals.push(parseInt(b.total_beds) || 0) }
    if (b.available_beds !== undefined) { sets.push('available_beds = ?'); vals.push(parseInt(b.available_beds) || 0) }
    if (b.icu_ventilators !== undefined) { sets.push('icu_ventilators = ?'); vals.push(parseInt(b.icu_ventilators) || 0) }
    if (b.available_ventilators !== undefined) { sets.push('available_ventilators = ?'); vals.push(parseInt(b.available_ventilators) || 0) }
    if (b.phone !== undefined) { sets.push('phone = ?'); vals.push(b.phone) }
    if (b.email !== undefined) { sets.push('email = ?'); vals.push(b.email) }
    if (b.website !== undefined) { sets.push('website = ?'); vals.push(b.website) }
    if (b.emergency_contact !== undefined) { sets.push('emergency_contact = ?'); vals.push(b.emergency_contact) }
    if (b.department !== undefined) { sets.push('department = ?'); vals.push(b.department) }
    if (b.head_doctor !== undefined) { sets.push('head_doctor = ?'); vals.push(b.head_doctor) }
    if (b.notes !== undefined) { sets.push('notes = ?'); vals.push(b.notes) }

    sets.push('last_updated = NOW()')
    vals.push(req.params.id)

    await db.execute(`UPDATE hospitals SET ${sets.join(', ')} WHERE id = ?`, vals)

    const [rows] = await db.execute('SELECT * FROM hospitals WHERE id = ?', [req.params.id])
    const updated = formatHospital(rows[0])
    req.app.get('io')?.emit('hospital:update', updated)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/hospitals/:id (admin only)
router.delete('/:id', authenticate, requireActive, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await getDB().execute('DELETE FROM hospitals WHERE id = ?', [req.params.id])
    if (!result.affectedRows) return res.status(404).json({ error: 'Hospital not found' })

    req.app.get('io')?.emit('hospital:delete', parseInt(req.params.id))
    res.json({ message: 'Hospital deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
