import { Router } from 'express'
import { getModels } from '../db.js'
import { authenticate, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

function formatHospital(row) {
  const hospital = row?.toJSON ? row.toJSON() : { ...row }
  if (hospital._id) {
    hospital.id = hospital._id.toString()
    delete hospital._id
  }
  if (hospital.assigned_rep_id) hospital.assigned_rep_id = hospital.assigned_rep_id.toString()
  hospital.coordinates = { lat: Number(hospital.lat) || 0, lng: Number(hospital.lng) || 0 }
  return hospital
}

// GET /api/hospitals (public)
router.get('/', async (req, res) => {
  try {
    const { Hospital } = getModels()
    const hospitals = await Hospital.find().sort({ name: 1 })
    res.json(hospitals.map(formatHospital))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/hospitals (admin only)
router.post('/', authenticate, requireActive, requireRole('admin'), async (req, res) => {
  try {
    const { name, address, coordinates, total_beds, available_beds } = req.body
    const lat = coordinates?.lat || 0
    const lng = coordinates?.lng || 0

    const { Hospital } = getModels()
    const hospital = await Hospital.create({
      name,
      address: address || '',
      lat,
      lng,
      total_beds: total_beds || 0,
      available_beds: available_beds || 0,
      last_updated: new Date(),
    })

    const clean = formatHospital(hospital)
    req.app.get('io')?.emit('hospital:create', clean)
    res.status(201).json(clean)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/hospitals/:id
router.put('/:id', authenticate, requireActive, async (req, res) => {
  try {
    const { Hospital } = getModels()
    const hospital = await Hospital.findById(req.params.id)
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' })

    const { role, id: userId } = req.user
    const assignedIds = (req.user.assigned_hospitals || []).map(String)

    // Permission check
    if (role === 'admin') {
      // full access
    } else if (role === 'moderator') {
      if (!assignedIds.includes(hospital.id)) {
        return res.status(403).json({ error: 'Not assigned to this hospital' })
      }
    } else if (role === 'rep') {
      if (!assignedIds.includes(hospital.id) && hospital.assigned_rep_id?.toString() !== userId) {
        return res.status(403).json({ error: 'Not assigned to this hospital' })
      }
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const b = req.body
    const updates = {}

    if (b.name !== undefined) updates.name = b.name
    if (b.address !== undefined) updates.address = b.address
    if (b.coordinates) {
      updates.lat = b.coordinates.lat || 0
      updates.lng = b.coordinates.lng || 0
    }
    if (b.total_beds !== undefined) updates.total_beds = parseInt(b.total_beds) || 0
    if (b.available_beds !== undefined) updates.available_beds = parseInt(b.available_beds) || 0
    if (b.icu_ventilators !== undefined) updates.icu_ventilators = parseInt(b.icu_ventilators) || 0
    if (b.available_ventilators !== undefined) updates.available_ventilators = parseInt(b.available_ventilators) || 0
    if (b.phone !== undefined) updates.phone = b.phone
    if (b.email !== undefined) updates.email = b.email
    if (b.website !== undefined) updates.website = b.website
    if (b.emergency_contact !== undefined) updates.emergency_contact = b.emergency_contact
    if (b.department !== undefined) updates.department = b.department
    if (b.head_doctor !== undefined) updates.head_doctor = b.head_doctor
    if (b.notes !== undefined) updates.notes = b.notes
    if (b.assigned_rep_id !== undefined) updates.assigned_rep_id = b.assigned_rep_id || null

    updates.last_updated = new Date()

    const updated = await Hospital.findByIdAndUpdate(req.params.id, updates, { new: true })
    const clean = formatHospital(updated)
    req.app.get('io')?.emit('hospital:update', clean)
    res.json(clean)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/hospitals/:id (admin only)
router.delete('/:id', authenticate, requireActive, requireRole('admin'), async (req, res) => {
  try {
    const { Hospital } = getModels()
    const deleted = await Hospital.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Hospital not found' })

    req.app.get('io')?.emit('hospital:delete', req.params.id)
    res.json({ message: 'Hospital deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
