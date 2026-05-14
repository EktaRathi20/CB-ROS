import { PrismaClient } from '@prisma/client';
import { LLMService } from './llm.js';

const prisma = new PrismaClient();

export class VectorService {
  /** Generate a 768-d embedding (Gemini text-embedding-004 or deterministic fallback). */
  static async generateEmbedding(text: string): Promise<number[]> {
    return LLMService.embed(text);
  }

  private static embeddingStorageDisabled = false;

  static async storeCandidateWithEmbedding(candidateId: string, embedding: number[]) {
    if (VectorService.embeddingStorageDisabled) return;
    const vectorString = `[${embedding.join(',')}]`;
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Candidate" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        candidateId
      );
    } catch (err: any) {
      // Most common failure: column dimension mismatch (e.g. DB still has
      // vector(1536) from the original migration but we now produce 768-d
      // embeddings). Disable for the rest of this process and continue —
      // dedup will fall back to formula-string matching.
      VectorService.embeddingStorageDisabled = true;
      console.warn(
        `Embedding persistence disabled for this run: ${err.message}. ` +
        `Apply the latest migration to enable vector dedup.`
      );
    }
  }

  /**
   * Top-K nearest candidates across all projects (legacy global search).
   */
  static async findSimilarCandidates(embedding: number[], limit: number = 5) {
    const vectorString = `[${embedding.join(',')}]`;
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT id, project_id, formula, predicted_score, metadata,
              (embedding <-> $1::vector) AS distance
       FROM "Candidate"
       WHERE embedding IS NOT NULL
       ORDER BY embedding <-> $1::vector
       LIMIT ${Math.max(1, Math.floor(limit))}`,
      vectorString
    );
  }

  /**
   * Top-K nearest candidates within a single project — used for diversity-aware
   * ranking and per-project deduplication (Step 4). Returns [] on dimension
   * mismatch so callers can gracefully skip vector dedup.
   */
  static async findSimilarInProject(
    projectId: string,
    embedding: number[],
    limit: number = 10
  ): Promise<any[]> {
    const vectorString = `[${embedding.join(',')}]`;
    try {
      return await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, formula, predicted_score, iteration_number,
                (embedding <-> $1::vector) AS distance
         FROM "Candidate"
         WHERE project_id = $2 AND embedding IS NOT NULL
         ORDER BY embedding <-> $1::vector
         LIMIT ${Math.max(1, Math.floor(limit))}`,
        vectorString,
        projectId
      );
    } catch (err: any) {
      console.warn(`Vector neighbor query failed (${err.message}); skipping vector dedup for this candidate.`);
      return [];
    }
  }
}
