import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'Việt Nam',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    elo: {
      type: Number,
      default: 1200,
    },
    points: {
      type: Number,
      default: 0,
    },
    coins: {
      type: Number,
      default: 50,
    },
    wins: {
      type: Number,
      default: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    winStreak: {
      type: Number,
      default: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
    },
    dailyStreak: {
      type: Number,
      default: 0,
    },
    lastPlayedDay: {
      type: String,
      default: null,
    },
    ownedSkins: {
      type: [String],
      default: ['piece:classic', 'board:default'],
    },
    equippedPieceSkin: {
      type: String,
      default: 'classic',
    },
    equippedBoardSkin: {
      type: String,
      default: 'default',
    },
    equippedEffectSkin: {
      type: String,
      default: 'none',
    },
    dailyQuests: {
      date: { type: String, default: null },
      gamesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      puzzlesSolved: { type: Number, default: 0 },
      claimedIds: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', UserSchema);
