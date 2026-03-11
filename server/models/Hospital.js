import mongoose from 'mongoose'

const HospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, default: '' },
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  total_beds: { type: Number, default: 0 },
  available_beds: { type: Number, default: 0 },
  icu_ventilators: { type: Number, default: 0 },
  available_ventilators: { type: Number, default: 0 },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  emergency_contact: { type: String, default: '' },
  department: { type: String, default: '' },
  head_doctor: { type: String, default: '' },
  notes: { type: String, default: '' },
  assigned_rep_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  last_updated: { type: Date, default: Date.now },
}, { timestamps: true })

HospitalSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    if (ret.assigned_rep_id) ret.assigned_rep_id = ret.assigned_rep_id.toString()
    ret.coordinates = { lat: ret.lat ?? 0, lng: ret.lng ?? 0 }
    return ret
  }
})

export default mongoose.model('Hospital', HospitalSchema)
