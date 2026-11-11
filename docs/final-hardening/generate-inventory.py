"""Rebuild a source control index. This is an audit aid, not browser-test evidence."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[2]
rows = []
pattern = re.compile(r'<(a|button|input|select|textarea|form|details|summary|dialog|CodeEditor|TeamSelect|AssetSelect|Pager|PageNavigation|Dialog|ConfirmDialog)\b')
for file in sorted((root / 'frontend/src').rglob('*.tsx')):
    source = file.read_text()
    for match in pattern.finditer(source):
        quote = None
        braces = 0
        escaped = False
        end = match.end()
        for end in range(end, len(source)):
            ch = source[end]
            if escaped:
                escaped = False
                continue
            if quote:
                if ch == '\\': escaped = True
                elif ch == quote: quote = None
                continue
            if ch in '\"\'`': quote = ch
            elif ch == '{': braces += 1
            elif ch == '}': braces -= 1
            elif ch == '>' and braces == 0: break
        opening = source[match.start():end+1]
        label = re.search(r'(?:aria-label|label|title|name)=([\"\'])(.*?)\1', opening, re.S)
        declarations = list(re.finditer(r'(?:export\s+)?function\s+(\w+)\s*\(', source[:match.start()]))
        component = declarations[-1].group(1) if declarations else file.stem
        excerpt = re.sub(r'\s+', ' ', opening).replace('\t', ' ')[:1200]
        rows.append([str(file.relative_to(root)), str(source.count('\n',0,match.start())+1), component,match.group(1),label.group(2) if label else '(dynamic/text; inspect source)',excerpt])
out = root/'docs/final-hardening/evidence/control-inventory.tsv'
out.write_text('file\tline\tcomponent\tcontrol\tlabel_or_name\tattributes_and_handlers\n'+'\n'.join('\t'.join(row) for row in rows)+'\n')
print(f'{len(rows)} JSX control declarations indexed; runtime repetitions share their source declaration.')
