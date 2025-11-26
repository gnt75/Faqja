import fs from 'fs';
import path from 'path';

// Përcaktojmë rrugët absolute për të shmangur gabimet në Windows
const currentDir = process.cwd();
const directoryPath = path.join(currentDir, 'public', 'ligje');
const tsOutputPath = path.join(currentDir, 'lawList.ts');

console.log('Duke kërkuar PDF në:', directoryPath);

try {
  // 1. Kontrollo nëse folderi ekziston
  if (!fs.existsSync(directoryPath)) {
    console.error(`GABIM: Folderi nuk u gjet në: ${directoryPath}`);
    console.log('Ju lutem krijoni folderin "public/ligje" dhe hidhni PDF-të aty.');
    process.exit(1);
  }

  const files = fs.readdirSync(directoryPath);

  // 2. Filtro vetëm skedarët PDF
  const pdfFiles = files.filter(file => 
    file.toLowerCase().endsWith('.pdf')
  );

  console.log(`U gjetën ${pdfFiles.length} dokumente PDF.`);

  // 3. Krijo skedarin TypeScript (lawList.ts)
  // Kjo e fut listën direkt në kod, duke eliminuar nevojën për fetch/json
  const tsContent = `// Ky skedar gjenerohet automatikisht nga "npm run generate"
// Mos e ndrysho manualisht.
export const lawList = ${JSON.stringify(pdfFiles, null, 2)};
`;

  fs.writeFileSync(tsOutputPath, tsContent);

  console.log('------------------------------------------------');
  console.log('SUKSES! Lista u krijua tek:', tsOutputPath);
  console.log('Hapi tjetër: Nisni aplikacionin me "npm run dev"');
  console.log('------------------------------------------------');

} catch (err) {
  console.error('Ndodhi një gabim gjatë gjenerimit:', err);
}