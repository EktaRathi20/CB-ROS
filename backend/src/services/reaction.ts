import { GoogleGenerativeAI } from '@google/generative-ai';
import { PubChemService } from './pubchem.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

export interface ResolvedReaction {
  reactants: string[];     // e.g. ["H2", "O2"]
  products: string[];      // e.g. ["H2O"]
  conditions: { temp?: string; pressure?: string; catalysisType?: string };
  inferred: boolean;       // true if Step 2 ran
  verification: Array<{ compound: string; verified: boolean; iupac?: string }>;
  raw_input: string;
}

export class ReactionService {
  /**
   * Step 1+2: take a raw reaction string (e.g. "H2 -> H2O"), parse it,
   * and if a side is missing, infer it via Gemini and verify the inferred
   * compounds on PubChem.
   *
   * If the reaction is already complete (both sides present), PubChem is
   * skipped entirely — catalyst discovery in Step 3+4 will source candidates
   * from literature, prior DB experiments, and Gemini.
   */
  static async resolve(input: string): Promise<ResolvedReaction> {
    const { reactants, products } = ReactionService.parse(input);

    const reactantsMissing = reactants.length === 0;
    const productsMissing = products.length === 0;
    const reactionComplete = !reactantsMissing && !productsMissing;

    if (reactionComplete) {
      return {
        reactants,
        products,
        conditions: {},
        inferred: false,
        verification: [], // PubChem intentionally skipped — full reaction provided
        raw_input: input,
      };
    }

    // Step 2: ask Gemini for the missing side, then verify ONLY the inferred
    // (or otherwise unverified) compounds via PubChem.
    const completion = await ReactionService.inferMissingSide({ reactants, products });
    const finalReactants = completion.reactants;
    const finalProducts = completion.products;
    const conditions = completion.conditions;

    const allCompounds = Array.from(new Set([...finalReactants, ...finalProducts]));
    const verification = await Promise.all(
      allCompounds.map(async (c) => {
        const meta = await PubChemService.getMetadata(c);
        return {
          compound: c,
          verified: meta && Object.keys(meta).length > 0,
          iupac: meta?.iupac_name,
        };
      })
    );

    return {
      reactants: finalReactants,
      products: finalProducts,
      conditions,
      inferred: true,
      verification,
      raw_input: input,
    };
  }

  /**
   * Parses "A + B -> C + D" / "A → C" / "A=>B" into reactant / product arrays.
   * Empty arrays are returned for missing sides.
   */
  static parse(input: string): { reactants: string[]; products: string[] } {
    const normalized = input.replace(/[→⟶⇌⇒]/g, '->').replace(/=>/g, '->');
    const [left, right] = normalized.split('->').map((s) => (s ?? '').trim());
    const split = (s: string) =>
      s
        ? s
            .split('+')
            .map((p) => p.trim())
            .filter(Boolean)
        : [];
    return { reactants: split(left), products: split(right) };
  }

  /**
   * Step 2: ask Gemini for the missing side of the reaction along with
   * typical conditions. Returns full balanced inputs.
   */
  private static async inferMissingSide(partial: {
    reactants: string[];
    products: string[];
  }): Promise<{
    reactants: string[];
    products: string[];
    conditions: ResolvedReaction['conditions'];
  }> {
    const prompt = `You are a chemistry assistant. Given a partial chemical reaction, return the complete balanced reaction along with typical operating conditions.

Partial input:
- Reactants: ${partial.reactants.length ? partial.reactants.join(' + ') : '(unknown)'}
- Products:  ${partial.products.length ? partial.products.join(' + ') : '(unknown)'}

Respond with ONLY valid JSON in the following shape (no prose, no markdown fences):
{
  "reactants": ["..."],
  "products":  ["..."],
  "conditions": { "temp": "e.g. 240C", "pressure": "e.g. 50 bar", "catalysisType": "e.g. Heterogeneous" }
}`;

    try {
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        reactants: Array.isArray(parsed.reactants) ? parsed.reactants : partial.reactants,
        products: Array.isArray(parsed.products) ? parsed.products : partial.products,
        conditions: parsed.conditions ?? {},
      };
    } catch (err: any) {
      console.error('Gemini reaction inference failed:', err.message);
      // Conservative fallback: keep the user's input, no conditions
      return {
        reactants: partial.reactants,
        products: partial.products,
        conditions: {},
      };
    }
  }
}
