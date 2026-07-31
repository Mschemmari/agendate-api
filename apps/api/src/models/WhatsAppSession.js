const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema(
  {
    waId: { type: String, required: true, unique: true, index: true },
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      default: null,
    },
    step: {
      type: String,
      enum: [
        'need_slug',
        'show_slots',
        'need_name',
        'need_email',
        'waitlist_name',
        'waitlist_email',
        'done',
      ],
      default: 'need_slug',
    },
    draft: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppSession', whatsappSessionSchema);
