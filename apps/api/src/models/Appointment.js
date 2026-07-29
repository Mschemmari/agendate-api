const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
    source: {
      type: String,
      enum: ['pro', 'link'],
      required: true,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ professionalId: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
