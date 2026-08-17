export interface OFXTransaction {
    date: string; // ISO YYYY-MM-DD
    amount: number; // signed: positive = credit/income, negative = debit/expense
    description: string;
    fitId: string;
    type: 'CREDIT' | 'DEBIT';
}

// OFX 1.x is SGML — leaf elements (<DTPOSTED>20240115) have no closing tag,
// only aggregates (<STMTTRN>...</STMTTRN>) do. OFX 2.x is well-formed XML,
// where every leaf also has a closing tag. This field extractor works for
// both: it grabs everything after <TAG> up to the next `<`, which is either
// a newline-terminated SGML value or an XML closing tag.
function getField(block: string, tag: string): string {
    const m = block.match(new RegExp(`<${tag}>([^\r\n<]*)`, 'i'));
    return m ? m[1].trim() : '';
}

function parseOFXDate(raw: string): string {
    const digits = raw.replace(/[^\d]/g, '').slice(0, 8);
    if (digits.length < 8) return '';
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    return `${y}-${m}-${d}`;
}

export function parseOFX(content: string): OFXTransaction[] {
    const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

    return blocks
        .map((block): OFXTransaction | null => {
            const dtposted = getField(block, 'DTPOSTED');
            const trnamt = getField(block, 'TRNAMT');
            const name = getField(block, 'NAME') || getField(block, 'MEMO') || getField(block, 'PAYEE');
            const fitId = getField(block, 'FITID');
            const trntype = getField(block, 'TRNTYPE').toUpperCase();

            const date = parseOFXDate(dtposted);
            const amount = parseFloat(trnamt.replace(',', '.'));
            if (!date || Number.isNaN(amount)) return null;

            const type: 'CREDIT' | 'DEBIT' =
                trntype === 'CREDIT' || trntype === 'DEP' ? 'CREDIT' :
                trntype === 'DEBIT' ? 'DEBIT' :
                amount >= 0 ? 'CREDIT' : 'DEBIT';

            return {
                date,
                amount,
                description: name || 'Transação importada',
                fitId: fitId || `${dtposted}_${trnamt}_${name}`,
                type
            };
        })
        .filter((t): t is OFXTransaction => t !== null);
}
