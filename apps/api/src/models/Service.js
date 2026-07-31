const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 5, default: 45 },
    price: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
