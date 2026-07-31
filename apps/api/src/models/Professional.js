const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sessionMode: {
      type: String,
      enum: ['individual', 'group'],
      default: 'individual',
    },
    expoPushTokens: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Professional', professionalSchema);
