import mongoose from 'mongoose';

const MoveSchema = new mongoose.Schema(
  {
    ply: { type: Number, required: true },
    moveNumber: { type: Number, required: true },
    color: { type: String, enum: ['w', 'b'], required: true },
    san: { type: String, required: true },
    uci: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    fenBefore: { type: String, required: true },
    fenAfter: { type: String, required: true },
    quality: { type: String },
    evalAfterCp: { type: Number, default: null },
    evalAfterMate: { type: Number, default: null },
    bestMoveUci: { type: String },
    bestMoveSan: { type: String },
    cpLoss: { type: Number },
    explanation: { type: String },
  },
  { _id: false }
);

const GameSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    title: { type: String, default: 'Ván cờ với AI' },
    mode: { type: String, enum: ['play', 'openings', 'puzzles', 'analyze'], default: 'play' },
    playerColor: { type: String, enum: ['w', 'b'], default: 'w' },
    aiElo: { type: Number, default: 1200 },
    result: { type: String, default: 'Đang chơi' },
    winner: { type: String, enum: ['player', 'ai', 'draw', 'none'], default: 'none' },
    startFen: { type: String, required: true },
    finalFen: { type: String, required: true },
    blunders: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    avgCpLoss: { type: Number, default: 0 },
    moves: { type: [MoveSchema], default: [] },
  },
  { timestamps: true }
);

export const Game = mongoose.model('Game', GameSchema);
