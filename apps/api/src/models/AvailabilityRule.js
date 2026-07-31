const mongoose = require('mongoose');

const availabilityRuleSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      index: true,
    },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, min: 1, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AvailabilityRule', availabilityRuleSchema);
