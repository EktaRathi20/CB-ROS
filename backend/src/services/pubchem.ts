import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PubChemService {
  /**
   * Fetches catalyst metadata from PubChem if missing in DB.
   */
  static async getMetadata(formula: string): Promise<any> {
    // 1. Check Database for existing candidate with this formula
    const existing = await prisma.candidate.findFirst({
      where: { formula },
      select: { metadata: true }
    });

    if (existing && Object.keys(existing.metadata as any).length > 0) {
      return existing.metadata;
    }

    // 2. Call PubChem API
    try {
      return await this.fetchFromPubChem(formula);
    } catch (error: any) {
      // 3. Fallback: Try searching for the first element/part (e.g., "Pt" from "Pt1/CoP")
      const primaryPart = formula.split(/[^a-zA-Z0-9]/)[0];
      if (primaryPart && primaryPart !== formula) {
        try {
          console.log(`PubChem: Full formula not found. Attempting fallback search for: ${primaryPart}`);
          return await this.fetchFromPubChem(primaryPart);
        } catch (fallbackError) {
          // Ignore fallback errors
        }
      }

      if (error.response?.status === 404) {
        console.warn(`PubChem: No specific metadata for "${formula}". Using generic properties.`);
      } else {
        console.error(`PubChem fetch failed:`, error.message);
      }
      return {};
    }
  }

  private static async fetchFromPubChem(name: string) {
    const response = await axios.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/JSON`);
    const data = response.data;
    const metadata = {
      molecular_weight: data.PC_Compounds[0]?.props.find((p: any) => p.urn.label === 'Molecular Weight')?.value.fval,
      iupac_name: data.PC_Compounds[0]?.props.find((p: any) => p.urn.label === 'IUPAC Name' && p.urn.name === 'Preferred')?.value.sval,
      source: 'PubChem'
    };

    console.log(`✅ PubChem: Successfully retrieved metadata for "${name}"`);
    console.log(JSON.stringify(metadata, null, 2));
    return metadata;
  }
}
