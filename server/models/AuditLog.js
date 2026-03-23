const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'hospital.create',
      'hospital.update',
      'hospital.delete',
      'hospital.bed_update',
      'hospital.assign',
      'hospital.unassign',
      'user.role_change',
      'user.deactivate',
      'user.activate',
      'ambulance.request',
      'ambulance.accept',
      'ambulance.status_change',
      'ambulance.cancel',
    ],
  },
  resource_type: {
    type: String,
    required: true,
    enum: ['hospital', 'user', 'ambulance_request'],
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip_address: {
    type: String,
  },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90-day TTL

module.exports = mongoose.model('AuditLog', auditLogSchema);
