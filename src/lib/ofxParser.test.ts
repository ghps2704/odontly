import { describe, it, expect } from 'vitest';
import { parseOFX } from './ofxParser';

// Minimal OFX 1.x (SGML) sample — leaf elements have no closing tags.
const SAMPLE_OFX_SGML = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260115120000
<TRNAMT>1250.50
<FITID>202601150001
<NAME>Pagamento recebido - Paciente João
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260116
<TRNAMT>-89.90
<FITID>202601160002
<MEMO>Compra de material odontológico
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

// OFX 2.x — well-formed XML, leaf elements ARE closed.
const SAMPLE_OFX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260210</DTPOSTED>
            <TRNAMT>-45.00</TRNAMT>
            <FITID>xml-001</FITID>
            <NAME>Assinatura software</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

describe('parseOFX', () => {
    it('parses SGML (OFX 1.x) transactions with unclosed leaf tags', () => {
        const result = parseOFX(SAMPLE_OFX_SGML);
        expect(result).toHaveLength(2);

        expect(result[0]).toEqual({
            date: '2026-01-15',
            amount: 1250.50,
            description: 'Pagamento recebido - Paciente João',
            fitId: '202601150001',
            type: 'CREDIT'
        });

        expect(result[1]).toEqual({
            date: '2026-01-16',
            amount: -89.90,
            description: 'Compra de material odontológico',
            fitId: '202601160002',
            type: 'DEBIT'
        });
    });

    it('parses XML (OFX 2.x) transactions with closed leaf tags', () => {
        const result = parseOFX(SAMPLE_OFX_XML);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            date: '2026-02-10',
            amount: -45.00,
            description: 'Assinatura software',
            fitId: 'xml-001',
            type: 'DEBIT'
        });
    });

    it('falls back to sign-based type when TRNTYPE is missing or unrecognized', () => {
        const ofx = `<STMTTRN><DTPOSTED>20260301<TRNAMT>200.00<FITID>f1<NAME>Recebimento</STMTTRN>`;
        const result = parseOFX(ofx);
        expect(result[0].type).toBe('CREDIT');
    });

    it('falls back to NAME/MEMO/PAYEE priority and a synthetic fitId when missing', () => {
        const ofx = `<STMTTRN><DTPOSTED>20260301<TRNAMT>50<PAYEE>Loja X</STMTTRN>`;
        const result = parseOFX(ofx);
        expect(result[0].description).toBe('Loja X');
        expect(result[0].fitId).toBeTruthy();
    });

    it('skips malformed blocks missing a date or a valid amount', () => {
        const ofx = `
            <STMTTRN><TRNAMT>10.00<FITID>no-date</STMTTRN>
            <STMTTRN><DTPOSTED>20260301<TRNAMT>abc<FITID>bad-amount</STMTTRN>
        `;
        expect(parseOFX(ofx)).toEqual([]);
    });

    it('returns an empty array for content with no STMTTRN blocks', () => {
        expect(parseOFX('not an ofx file')).toEqual([]);
    });
});
