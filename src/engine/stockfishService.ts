import { Chess } from 'chess.js';
import type { EngineLine } from '../types/chess';

type AnalysisCallback = (lines: EngineLine[]) => void;

class StockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private readyResolvers: (() => void)[] = [];
  private currentSearchId = 0;
  private activeBestMoveResolver: ((bestMove: string | null) => void) | null = null;
  private activeLines: Map<number, EngineLine> = new Map();
  private activeFen = '';
  private activeOnUpdate: AnalysisCallback | null = null;
  private commandQueue: Promise<void> = Promise.resolve();

  private initWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker('/engine/stockfish-19-lite-single.js');
    this.worker = worker;

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = typeof event.data === 'string' ? event.data.trim() : '';
      if (!line) return;

      if (line === 'uciok') {
        worker.postMessage('setoption name Threads value 1');
        worker.postMessage('setoption name Hash value 32');
        worker.postMessage('isready');
        return;
      }

      if (line === 'readyok') {
        this.isReady = true;
        const resolvers = this.readyResolvers.splice(0);
        resolvers.forEach((r) => r());
        return;
      }

      if (line.startsWith('info ') && line.includes(' pv ')) {
        this.handleInfoLine(line);
        return;
      }

      if (line.startsWith('bestmove ')) {
        const parts = line.split(/\s+/);
        const bestMove = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
        const resolver = this.activeBestMoveResolver;
        this.activeBestMoveResolver = null;
        if (resolver) resolver(bestMove);
      }
    };

    worker.onerror = (err) => {
      console.error('Stockfish Worker Error:', err);
    };

    worker.postMessage('uci');
    return worker;
  }

  public async ensureReady(): Promise<void> {
    this.initWorker();
    if (this.isReady) return;
    return new Promise((resolve) => {
      this.readyResolvers.push(resolve);
    });
  }

  private handleInfoLine(line: string) {
    if (!this.activeFen) return;

    const depthMatch = line.match(/\bdepth (\d+)/);
    const multipvMatch = line.match(/\bmultipv (\d+)/);
    const cpMatch = line.match(/\bscore cp (-?\d+)/);
    const mateMatch = line.match(/\bscore mate (-?\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);

    if (!pvMatch) return;
    if (line.includes('lowerbound') || line.includes('upperbound')) return;

    const depth = depthMatch ? parseInt(depthMatch[1], 10) : 1;
    const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
    const pvUci = pvMatch[1].trim().split(/\s+/);

    const turnIsBlack = this.activeFen.split(' ')[1] === 'b';
    const sign = turnIsBlack ? -1 : 1;

    let scoreCp: number | null = null;
    let mate: number | null = null;

    if (mateMatch) {
      mate = parseInt(mateMatch[1], 10) * sign;
    } else if (cpMatch) {
      scoreCp = parseInt(cpMatch[1], 10) * sign;
    }

    const pvSan = this.uciListToSan(this.activeFen, pvUci.slice(0, 6));

    this.activeLines.set(multipv, {
      multipv,
      depth,
      scoreCp,
      mate,
      pvUci,
      pvSan,
    });

    if (this.activeOnUpdate) {
      const sorted = Array.from(this.activeLines.values()).sort((a, b) => a.multipv - b.multipv);
      this.activeOnUpdate(sorted);
    }
  }

  private uciListToSan(fen: string, uciMoves: string[]): string[] {
    const chess = new Chess(fen);
    const sans: string[] = [];
    for (const uci of uciMoves) {
      if (uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      try {
        const move = chess.move({ from, to, promotion });
        if (!move) break;
        sans.push(move.san);
      } catch {
        break;
      }
    }
    return sans;
  }

  public stopSearch(): Promise<void> {
    this.currentSearchId++;
    if (!this.worker || !this.activeBestMoveResolver) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const prevResolver = this.activeBestMoveResolver;
      this.activeBestMoveResolver = (move) => {
        if (prevResolver) prevResolver(move);
        resolve();
      };
      this.worker?.postMessage('stop');
    });
  }

  public analyzePosition(
    fen: string,
    depth = 13,
    multiPv = 3,
    onUpdate?: AnalysisCallback
  ): Promise<EngineLine[]> {
    const searchId = ++this.currentSearchId;

    const run = async (): Promise<EngineLine[]> => {
      await this.ensureReady();
      if (searchId !== this.currentSearchId) return [];

      if (this.activeBestMoveResolver) {
        await new Promise<void>((resolve) => {
          const prev = this.activeBestMoveResolver;
          this.activeBestMoveResolver = (m) => {
            if (prev) prev(m);
            resolve();
          };
          this.worker?.postMessage('stop');
        });
      }

      if (searchId !== this.currentSearchId) return [];

      this.activeFen = fen;
      this.activeLines.clear();
      this.activeOnUpdate = onUpdate || null;

      return new Promise<EngineLine[]>((resolve) => {
        this.activeBestMoveResolver = () => {
          const sorted = Array.from(this.activeLines.values()).sort((a, b) => a.multipv - b.multipv);
          resolve(sorted);
        };
        this.worker!.postMessage(`setoption name MultiPV value ${multiPv}`);
        this.worker!.postMessage('setoption name Skill Level value 20');
        this.worker!.postMessage(`position fen ${fen}`);
        this.worker!.postMessage(`go depth ${depth}`);
      });
    };

    const p = this.commandQueue.then(run, run);
    this.commandQueue = p.then(() => undefined, () => undefined);
    return p;
  }

  public getAiMove(fen: string, skillLevel: number, moveTimeMs = 600): Promise<string | null> {
    const searchId = ++this.currentSearchId;

    const run = async (): Promise<string | null> => {
      await this.ensureReady();
      if (searchId !== this.currentSearchId) return null;

      if (this.activeBestMoveResolver) {
        await new Promise<void>((resolve) => {
          const prev = this.activeBestMoveResolver;
          this.activeBestMoveResolver = (m) => {
            if (prev) prev(m);
            resolve();
          };
          this.worker?.postMessage('stop');
        });
      }

      if (searchId !== this.currentSearchId) return null;

      this.activeFen = fen;
      this.activeLines.clear();
      this.activeOnUpdate = null;

      return new Promise<string | null>((resolve) => {
        this.activeBestMoveResolver = (bestMove) => {
          resolve(bestMove);
        };
        this.worker!.postMessage('setoption name MultiPV value 1');
        this.worker!.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, skillLevel))}`);
        this.worker!.postMessage(`position fen ${fen}`);
        this.worker!.postMessage(`go movetime ${moveTimeMs}`);
      });
    };

    const p = this.commandQueue.then(run, run);
    this.commandQueue = p.then(() => undefined, () => undefined);
    return p;
  }
}

export const stockfishService = new StockfishService();
