const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

patientSchema.index({ professionalId: 1, email: 1 });

module.exports = mongoose.model('Patient', patientSchema);
