import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Erro: GEMINI_API_KEY não foi encontrada no ficheiro .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Pastas que a IA vai varrer para corrigir os erros
const DIRECTORIES_TO_AUDIT = [
  'server/services',
  'server/queries.ts',
  'shared'
];

function getFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const fileStat = fs.statSync(fullPath);
    if (fileStat && fileStat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

async function runIntelligentAudit() {
  console.log("🤖 [IA] Iniciando Varredura de Arquivos no Termux...");
  
  let filesToAnalyze: string[] = [];
  for (const dir of DIRECTORIES_TO_AUDIT) {
    filesToAnalyze = filesToAnalyze.concat(getFiles(dir));
  }

  if (filesToAnalyze.length === 0) {
    console.log("⚠️ Nenhum arquivo TypeScript encontrado para análise.");
    return;
  }

  console.log(`📂 Encontrados ${filesToAnalyze.length} arquivos para auditoria.`);

  for (const filePath of filesToAnalyze) {
    console.log(`\n🔍 Analisando e corrigindo: ${filePath} ...`);
    const originalContent = fs.readFileSync(filePath, 'utf8');

    const prompt = `
      Você é um Engenheiro de Software Sênior. Analise o seguinte arquivo TypeScript do projeto MINE-REDE-SOCIAL (tRPC, Drizzle ORM, Express).
      Identifique bugs, erros de tipo, falhas de segurança ou problemas de performance.
      
      Retorne APENAS o código corrigido e completo do arquivo. Não inclua explicações, comentários explicativos fora do código, nem marcações de markdown como \`\`\`typescript. O seu retorno deve ser puramente o código limpo pronto para ser escrito no arquivo.

      CÓDIGO ORIGINAL DO ARQUIVO (${filePath}):
      ${originalContent}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const correctedCode = response.text?.trim();

      if (correctedCode && correctedCode !== originalContent) {
        // Criar um backup de segurança antes de sobrescrever
        fs.writeFileSync(`${filePath}.bak`, originalContent);
        
        // Sobrescrever o arquivo original com o código da IA
        fs.writeFileSync(filePath, correctedCode);
        console.log(`✅ Arquivo ${filePath} corrigido com sucesso! (Backup gerado em .bak)`);
      } else {
        console.log(`✨ Arquivo ${filePath} já está limpo e sem erros aparentes.`);
      }
    } catch (error) {
      console.error(`❌ Erro ao auditar o arquivo ${filePath}:`, error);
    }
  }

  console.log("\n🏁 Auditoria e correções automáticas finalizadas!");
}

runIntelligentAudit();


