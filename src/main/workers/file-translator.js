import fs from 'fs';
import path from 'path';

let turndownService = null;
async function getTurndown() {
  if (!turndownService) {
    const Turndown = (await import('turndown')).default;
    turndownService = new Turndown({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }
  return turndownService;
}

export async function translateFileToMarkdown(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);

  switch (ext) {
    case '.pdf': {
      try {
        const { extractText } = await import('unpdf');
        const pdfData = await extractText(new Uint8Array(buffer));
        const pages = pdfData.text || [];
        let combinedMd = '';

        if (Array.isArray(pages)) {
          pages.forEach((pageText, index) => {
            const pageNum = index + 1;
            combinedMd += `<!-- FILE: ${filePath} | TYPE: pdf | PAGE: ${pageNum} -->\n\n${pageText.trim()}\n\n`;
          });
        } else {
          combinedMd = `<!-- FILE: ${filePath} | TYPE: pdf | PAGE: 1 -->\n\n${String(pages).trim()}\n\n`;
        }

        return {
          title: baseName,
          type: 'pdf',
          pageCount: Array.isArray(pages) ? pages.length : 1,
          markdown: combinedMd.trim()
        };
      } catch (err) {
        return {
          title: baseName,
          type: 'pdf',
          pageCount: 1,
          markdown: `<!-- FILE: ${filePath} | TYPE: pdf | PAGE: 1 -->\n\n[Error translating PDF: ${err.message}]`
        };
      }
    }

    case '.docx': {
      try {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.convertToHtml({ buffer });
        const td = await getTurndown();
        const mdContent = td.turndown(result.value || '');

        return {
          title: baseName,
          type: 'docx',
          pageCount: 1,
          markdown: `<!-- FILE: ${filePath} | TYPE: docx | PAGE: 1 -->\n\n# ${baseName}\n\n${mdContent.trim()}`
        };
      } catch (err) {
        return {
          title: baseName,
          type: 'docx',
          pageCount: 1,
          markdown: `<!-- FILE: ${filePath} | TYPE: docx | PAGE: 1 -->\n\n[Error translating DOCX: ${err.message}]`
        };
      }
    }

    case '.xlsx':
    case '.xls': {
      try {
        const xlsx = (await import('xlsx')).default;
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let combinedMd = '';

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = xlsx.utils.sheet_to_csv(sheet);
          if (csv && csv.trim()) {
            const lines = csv.trim().split('\n');
            let tableMd = `### Sheet: ${sheetName}\n\n`;
            if (lines.length > 0) {
              const headers = lines[0].split(',').map(h => h.trim());
              tableMd += `| ${headers.join(' | ')} |\n`;
              tableMd += `| ${headers.map(() => '---').join(' | ')} |\n`;
              for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(',').map(c => c.trim());
                tableMd += `| ${row.join(' | ')} |\n`;
              }
            }
            combinedMd += `<!-- FILE: ${filePath} | TYPE: ${ext.slice(1)} | PAGE: ${sheetName} -->\n\n${tableMd}\n\n`;
          }
        });

        return {
          title: baseName,
          type: 'xlsx',
          pageCount: workbook.SheetNames.length,
          markdown: combinedMd.trim() || `<!-- FILE: ${filePath} | TYPE: xlsx | PAGE: 1 -->\n\n(Empty spreadsheet)`
        };
      } catch (err) {
        return {
          title: baseName,
          type: 'xlsx',
          pageCount: 1,
          markdown: `<!-- FILE: ${filePath} | TYPE: xlsx | PAGE: 1 -->\n\n[Error translating spreadsheet: ${err.message}]`
        };
      }
    }

    case '.csv': {
      const rawCsv = buffer.toString('utf-8');
      const lines = rawCsv.trim().split('\n');
      let tableMd = '';
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim());
        tableMd += `| ${headers.join(' | ')} |\n`;
        tableMd += `| ${headers.map(() => '---').join(' | ')} |\n`;
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim());
          tableMd += `| ${row.join(' | ')} |\n`;
        }
      }

      return {
        title: baseName,
        type: 'csv',
        pageCount: 1,
        markdown: `<!-- FILE: ${filePath} | TYPE: csv | PAGE: 1 -->\n\n${tableMd}`
      };
    }

    case '.html':
    case '.htm': {
      try {
        const td = await getTurndown();
        const html = buffer.toString('utf-8');
        const mdContent = td.turndown(html);

        return {
          title: baseName,
          type: 'html',
          pageCount: 1,
          markdown: `<!-- FILE: ${filePath} | TYPE: html | PAGE: 1 -->\n\n${mdContent.trim()}`
        };
      } catch (err) {
        return {
          title: baseName,
          type: 'html',
          pageCount: 1,
          markdown: `<!-- FILE: ${filePath} | TYPE: html | PAGE: 1 -->\n\n${buffer.toString('utf-8')}`
        };
      }
    }

    case '.md':
    case '.markdown':
    case '.txt': {
      const text = buffer.toString('utf-8');
      return {
        title: baseName,
        type: ext.slice(1),
        pageCount: 1,
        markdown: `<!-- FILE: ${filePath} | TYPE: ${ext.slice(1)} | PAGE: 1 -->\n\n${text.trim()}`
      };
    }

    default: {
      const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yaml', '.yml', '.c', '.cpp', '.java', '.rs', '.go', '.sh', '.bat', '.sql', '.css'];
      const lang = ext.slice(1) || 'text';
      const text = buffer.toString('utf-8');

      return {
        title: baseName,
        type: codeExts.includes(ext) ? 'code' : 'text',
        pageCount: 1,
        markdown: `<!-- FILE: ${filePath} | TYPE: code | PAGE: 1 -->\n\n# ${baseName}\n\n\`\`\`${lang}\n${text}\n\`\`\``
      };
    }
  }
}
