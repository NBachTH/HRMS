"""
Convert tuan7_report.md to tuan7_report.docx with proper formatting.
"""

import re
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

# ── helpers ──────────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color: str):
    """Fill a table cell with a background colour (hex without #)."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_borders(cell, border_color='CCCCCC'):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for side in ('top', 'left', 'bottom', 'right'):
        b = OxmlElement(f'w:{side}')
        b.set(qn('w:val'), 'single')
        b.set(qn('w:sz'), '4')
        b.set(qn('w:space'), '0')
        b.set(qn('w:color'), border_color)
        borders.append(b)
    tcPr.append(borders)

def remove_paragraph_spacing(para):
    pPr = para._p.get_or_add_pPr()
    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), '0')
    spacing.set(qn('w:after'), '60')
    pPr.append(spacing)

def add_paragraph_spacing(para, before=0, after=120):
    pPr = para._p.get_or_add_pPr()
    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), str(before))
    spacing.set(qn('w:after'), str(after))
    pPr.append(spacing)

def add_run_with_style(para, text, bold=False, italic=False,
                       color=None, font_size=None, code=False):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = RGBColor(*bytes.fromhex(color))
    if font_size:
        run.font.size = Pt(font_size)
    if code:
        run.font.name = 'Courier New'
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)
    return run

def set_doc_margins(doc, top=2, bottom=2, left=2.5, right=2.5):
    for section in doc.sections:
        section.top_margin    = Cm(top)
        section.bottom_margin = Cm(bottom)
        section.left_margin   = Cm(left)
        section.right_margin  = Cm(right)

# ── inline markdown parser ────────────────────────────────────────────────────

def render_inline(para, text: str, base_size: float = 10.5):
    """
    Parse a line of inline markdown and add runs to *para*.
    Handles: **bold**, *italic*, `code`, and plain text.
    Also handles escaped backtick sequences correctly.
    """
    # Split on bold (**), italic (*), and inline code (`)
    pattern = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)')
    parts = pattern.split(text)
    for part in parts:
        if not part:
            continue
        if part.startswith('**') and part.endswith('**'):
            add_run_with_style(para, part[2:-2], bold=True, font_size=base_size)
        elif part.startswith('*') and part.endswith('*'):
            add_run_with_style(para, part[1:-1], italic=True, font_size=base_size)
        elif part.startswith('`') and part.endswith('`'):
            add_run_with_style(para, part[1:-1], code=True)
        else:
            run = para.add_run(part)
            run.font.size = Pt(base_size)

# ── table builder ─────────────────────────────────────────────────────────────

def add_markdown_table(doc, lines):
    """Parse pipe-delimited markdown table lines and add a styled Word table."""
    rows = []
    for line in lines:
        line = line.strip()
        if not line or re.match(r'^\|[-:| ]+\|$', line):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        rows.append(cells)

    if not rows:
        return

    col_count = max(len(r) for r in rows)
    # Pad rows
    rows = [r + [''] * (col_count - len(r)) for r in rows]

    table = doc.add_table(rows=len(rows), cols=col_count)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.LEFT

    # Set column widths evenly
    total_width = Cm(16)
    col_width = total_width / col_count
    for col in table.columns:
        for cell in col.cells:
            cell.width = col_width

    for r_idx, row_data in enumerate(rows):
        row = table.rows[r_idx]
        for c_idx, cell_text in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            if r_idx == 0:
                set_cell_bg(cell, '2E4057')  # dark header
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                render_inline(p, cell_text.strip('**'), base_size=9.5)
                for run in p.runs:
                    run.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                bg = 'F8F9FA' if r_idx % 2 == 0 else 'FFFFFF'
                set_cell_bg(cell, bg)
                p = cell.paragraphs[0]
                remove_paragraph_spacing(p)
                render_inline(p, cell_text, base_size=9.5)

            set_cell_borders(cell)

    # Add spacing after table
    doc.add_paragraph('')

# ── code block builder ────────────────────────────────────────────────────────

def add_code_block(doc, lines):
    """Add a shaded code block."""
    para = doc.add_paragraph()
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F0F0F0')
    pPr.append(shd)
    # Left indent
    ind = OxmlElement('w:ind')
    ind.set(qn('w:left'), '360')
    pPr.append(ind)

    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), '60')
    spacing.set(qn('w:after'), '60')
    spacing.set(qn('w:line'), '240')
    pPr.append(spacing)

    code_text = '\n'.join(lines)
    run = para.add_run(code_text)
    run.font.name = 'Courier New'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(0x1E, 0x1E, 0x1E)

# ── blockquote ────────────────────────────────────────────────────────────────

def add_blockquote(doc, text):
    para = doc.add_paragraph()
    pPr = para._p.get_or_add_pPr()
    ind = OxmlElement('w:ind')
    ind.set(qn('w:left'), '480')
    ind.set(qn('w:right'), '240')
    pPr.append(ind)
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'EEF4FF')
    pPr.append(shd)
    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), '60')
    spacing.set(qn('w:after'), '60')
    pPr.append(spacing)
    # Strip leading > and spaces
    clean = re.sub(r'^>\s*', '', text)
    render_inline(para, clean, base_size=10)
    for run in para.runs:
        run.italic = True
        run.font.color.rgb = RGBColor(0x44, 0x55, 0x77)

# ── horizontal rule ───────────────────────────────────────────────────────────

def add_hr(doc):
    para = doc.add_paragraph()
    pPr = para._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'AAAAAA')
    pBdr.append(bottom)
    pPr.append(pBdr)
    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), '60')
    spacing.set(qn('w:after'), '60')
    pPr.append(spacing)

# ── main document builder ─────────────────────────────────────────────────────

def build_docx(md_path: str, out_path: str):
    with open(md_path, encoding='utf-8') as f:
        raw_lines = f.readlines()

    lines = [l.rstrip('\n') for l in raw_lines]

    doc = Document()
    set_doc_margins(doc)

    # Default style
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(10.5)

    i = 0
    n = len(lines)

    # ── heading colours ──
    H1_COLOR = '1A3A5C'   # dark navy
    H2_COLOR = '1A3A5C'
    H3_COLOR = '2E6DA4'
    H4_COLOR = '3A7EC4'

    while i < n:
        line = lines[i]

        # ── skip empty ──
        if line.strip() == '':
            i += 1
            continue

        # ── horizontal rule ──
        if line.strip() in ('---', '***', '___'):
            add_hr(doc)
            i += 1
            continue

        # ── fenced code block ──
        if line.strip().startswith('```'):
            lang = line.strip()[3:].strip()
            i += 1
            code_lines = []
            while i < n and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1  # consume closing ```
            add_code_block(doc, code_lines)
            continue

        # ── blockquote ──
        if line.startswith('>'):
            add_blockquote(doc, line)
            i += 1
            continue

        # ── ATX headings ──
        h_match = re.match(r'^(#{1,6})\s+(.*)', line)
        if h_match:
            level = len(h_match.group(1))
            title = h_match.group(2).strip()
            if level == 1:
                para = doc.add_heading('', level=1)
                para.clear()
                run = para.add_run(title)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(16)
                run.bold = True
                run.font.color.rgb = RGBColor(*bytes.fromhex(H1_COLOR))
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                add_paragraph_spacing(para, before=120, after=120)
            elif level == 2:
                para = doc.add_heading('', level=2)
                para.clear()
                run = para.add_run(title)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(13)
                run.bold = True
                run.font.color.rgb = RGBColor(*bytes.fromhex(H2_COLOR))
                pPr = para._p.get_or_add_pPr()
                pBdr = OxmlElement('w:pBdr')
                bottom = OxmlElement('w:bottom')
                bottom.set(qn('w:val'), 'single')
                bottom.set(qn('w:sz'), '8')
                bottom.set(qn('w:space'), '2')
                bottom.set(qn('w:color'), '2E4057')
                pBdr.append(bottom)
                pPr.append(pBdr)
                add_paragraph_spacing(para, before=200, after=80)
            elif level == 3:
                para = doc.add_heading('', level=3)
                para.clear()
                run = para.add_run(title)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(11.5)
                run.bold = True
                run.font.color.rgb = RGBColor(*bytes.fromhex(H3_COLOR))
                add_paragraph_spacing(para, before=160, after=60)
            elif level == 4:
                para = doc.add_heading('', level=4)
                para.clear()
                run = para.add_run(title)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(11)
                run.bold = True
                run.font.color.rgb = RGBColor(*bytes.fromhex(H4_COLOR))
                add_paragraph_spacing(para, before=120, after=40)
            else:
                para = doc.add_paragraph()
                run = para.add_run(title)
                run.bold = True
                run.font.size = Pt(10.5)
            i += 1
            continue

        # ── markdown table ──
        if line.strip().startswith('|'):
            table_lines = []
            while i < n and lines[i].strip().startswith('|'):
                table_lines.append(lines[i])
                i += 1
            add_markdown_table(doc, table_lines)
            continue

        # ── unordered list ──
        ul_match = re.match(r'^(\s*)[*\-]\s+(.*)', line)
        if ul_match:
            indent = len(ul_match.group(1)) // 2
            content = ul_match.group(2)
            para = doc.add_paragraph(style='List Bullet')
            # Adjust indent level
            pPr = para._p.get_or_add_pPr()
            numPr = pPr.find(qn('w:numPr'))
            if numPr is not None:
                ilvl = numPr.find(qn('w:ilvl'))
                if ilvl is not None:
                    ilvl.set(qn('w:val'), str(indent))
            remove_paragraph_spacing(para)
            render_inline(para, content, base_size=10.5)
            i += 1
            continue

        # ── ordered list ──
        ol_match = re.match(r'^\s*\d+\.\s+(.*)', line)
        if ol_match:
            content = ol_match.group(1)
            para = doc.add_paragraph(style='List Number')
            remove_paragraph_spacing(para)
            render_inline(para, content, base_size=10.5)
            i += 1
            continue

        # ── regular paragraph ──
        para = doc.add_paragraph()
        add_paragraph_spacing(para, before=0, after=80)
        render_inline(para, line, base_size=10.5)
        i += 1

    doc.save(out_path)
    print(f'Saved: {out_path}')


if __name__ == '__main__':
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    build_docx(
        os.path.join(base, 'tuan7_report.md'),
        os.path.join(base, 'tuan7_report.docx'),
    )
