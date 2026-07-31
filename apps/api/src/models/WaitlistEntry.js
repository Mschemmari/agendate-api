const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    /** Día preferido (inicio del día local ISO), opcional. */
    preferredDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['waiting', 'offered', 'booked', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

waitlistSchema.index({ professionalId: 1, status: 1, createdAt: 1 });
waitlistSchema.index(
  { professionalId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'waiting' } }
);

module.exports = mongoose.model('WaitlistEntry', waitlistSchema);
