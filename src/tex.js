// Turns the LaTeX used in question text into readable plain text with Unicode symbols (used for DOCX export).
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ' }
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋' }
const map = (s, m) => (s.split('').every((c) => m[c]) ? s.split('').map((c) => m[c]).join('') : null)
const SYM = { times: '×', cdot: '·', pm: '±', alpha: 'α', beta: 'β', gamma: 'γ', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', omega: 'ω', Delta: 'Δ', Omega: 'Ω', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', infty: '∞', circ: '°', to: '→', rightarrow: '→', int: '∫', sum: 'Σ', approx: '≈', angle: '∠', perp: '⊥', parallel: '∥' }
const one = (s) => (/^[\w.]+$/.test(s) ? s : '(' + s + ')')

export function texToText(t = '') {
  return String(t).replace(/\$([^$]+)\$/g, (_, m) => {
    let x = m.replace(/\^\s*\{?\\circ\}?/g, '°')
    x = x.replace(/\\ce\{([^}]*)\}/g, (_, c) => c.replace(/->/g, ' → ').replace(/([A-Za-z)])(\d+)/g, (_, a, d) => a + map(d, SUB)).replace(/\^(\d*[+-]?)/g, (_, e) => map(e, SUP) || '^' + e))
    for (let i = 0; i < 3; i++) x = x.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => one(a) + '/' + one(b)).replace(/\\sqrt\{([^{}]*)\}/g, (_, a) => '√' + one(a))
    x = x.replace(/\^\{([^{}]*)\}|\^(\w)/g, (_, a, b) => { const e = a ?? b; return map(e, SUP) || '^(' + e + ')' }).replace(/_\{([^{}]*)\}|_(\w)/g, (_, a, b) => { const e = a ?? b; return map(e, SUB) || '_(' + e + ')' })
    x = x.replace(/\\([A-Za-z]+)/g, (_, c) => SYM[c] || c).replace(/\\\\/g, '; ').replace(/\\[,;! ]/g, ' ').replace(/[{}]/g, '')
    return x.trim()
  })
}
