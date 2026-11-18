import mongoose from 'mongoose';

const ProgressSchema = new mongoose.Schema(
  {
    profileId: { type: String, unique: true, default: 'default' },
    solvedPuzzles: { type: [String], default: [] },
    completedOpenings: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Progress = mongoose.model('Progress', ProgressSchema);
