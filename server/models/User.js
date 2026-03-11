import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  displayName: { type: String, default: '' },
  role: { type: String, enum: ['rep', 'moderator', 'admin'], default: 'rep' },
  status: { type: String, enum: ['active', 'pending'], default: 'pending' },
  phone: { type: String, default: '' },
  organization: { type: String, default: '' },
  assigned_hospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
}, { timestamps: true })

UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    if (ret.assigned_hospitals) {
      ret.assigned_hospitals = ret.assigned_hospitals.map(id => id.toString())
    }
    delete ret.password
    return ret
  }
})

export default mongoose.model('User', UserSchema)
