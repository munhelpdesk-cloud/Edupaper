// ALL DUMMY DATA - replace with real database later.
export const MEDIA = ['English', 'Gujarati', 'Hindi']
export const TYPES = ['MCQ', 'True/False', 'Fill in the blanks', 'Very Short', 'Short', 'Long', 'Numerical', 'Equation', 'Diagram', 'Case-based']
const M10 = {
  Mathematics: { 'Real Numbers': ["Euclid's Lemma", 'HCF & LCM'], Polynomials: ['Zeroes', 'Relations'], 'Quadratic Equations': ['Roots', 'Discriminant'] },
  Science: { 'Chemical Reactions': ['Balancing', 'Types'], Light: ['Reflection', 'Refraction'], 'Life Processes': ['Nutrition', 'Respiration'] }
}
export const CUR = {
  GSEB: { 'Std 10': M10, 'Std 12': { Physics: { Electrostatics: ["Coulomb's law", 'Fields'], 'Current Electricity': ["Ohm's law", 'Circuits'] }, Chemistry: { Solutions: ['Molarity', 'Colligative'], Electrochemistry: ['Cells', 'Nernst'] } }, 'Std 9': {} },
  CBSE: { 'Class 10': { ...M10, Mathematics: { ...M10.Mathematics, Trigonometry: ['Ratios', 'Identities'] } }, 'Class 9': {} }
}
let k = 0
const Q = (sub, ch, type, marks, diff, text, ans, diagram) => ({ id: ++k, sub, ch, type, marks, diff, text, ans, diagram, src: 'Question Bank' })
export const BANK = [
  Q('Mathematics', 'Real Numbers', 'MCQ', 1, 'Easy', 'The HCF of 6 and 20 is: (a) 2 (b) 3 (c) 4 (d) 6', '(a) 2'),
  Q('Mathematics', 'Real Numbers', 'Short', 3, 'Medium', 'Prove that $\\sqrt{2}$ is irrational.', 'Proof by contradiction.'),
  Q('Mathematics', 'Polynomials', 'Short', 2, 'Easy', 'Find the zeroes of $x^2-5x+6$.', '$x=2,\\ 3$'),
  Q('Mathematics', 'Polynomials', 'Long', 4, 'Hard', 'If $\\alpha,\\beta$ are zeroes of $2x^2-7x+3$, find $\\alpha^2+\\beta^2$.', '$\\frac{37}{4}$'),
  Q('Mathematics', 'Quadratic Equations', 'Long', 4, 'Medium', 'Solve $2x^2+3x-5=0$ using $x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$.', '$x=1,\\ -\\frac{5}{2}$'),
  Q('Mathematics', 'Quadratic Equations', 'Numerical', 2, 'Easy', 'Find the discriminant of $3x^2-2x+\\frac{1}{3}=0$.', '$0$'),
  Q('Mathematics', 'Trigonometry', 'Equation', 3, 'Medium', 'Evaluate $\\frac{\\sin 30^\\circ+\\cos 60^\\circ}{\\tan 45^\\circ}$.', '$1$'),
  Q('Mathematics', 'Trigonometry', 'Short', 2, 'Easy', 'Prove $\\sin^2\\theta+\\cos^2\\theta=1$.', 'Use Pythagoras theorem.'),
  Q('Science', 'Chemical Reactions', 'Short', 2, 'Easy', 'Balance: $\\ce{H2 + O2 -> H2O}$', '$\\ce{2H2 + O2 -> 2H2O}$'),
  Q('Science', 'Chemical Reactions', 'MCQ', 1, 'Easy', 'The formula of sulphuric acid is: (a) $\\ce{HCl}$ (b) $\\ce{H2SO4}$ (c) $\\ce{HNO3}$ (d) $\\ce{CO2}$', '(b) $\\ce{H2SO4}$'),
  Q('Science', 'Chemical Reactions', 'Long', 4, 'Hard', 'Write the reaction of $\\ce{CaCO3}$ with HCl with state symbols.', '$\\ce{CaCO3(s) + 2HCl(aq) -> CaCl2(aq) + H2O(l) + CO2(g)}$'),
  Q('Science', 'Chemical Reactions', 'Fill in the blanks', 1, 'Easy', 'Sodium forms the ion ____ ($\\ce{Na+}$ / $\\ce{Na-}$).', '$\\ce{Na+}$'),
  Q('Science', 'Light', 'Numerical', 4, 'Hard', 'An object is 20 cm from a concave mirror of focal length 15 cm. Find the image distance using $\\frac{1}{v}+\\frac{1}{u}=\\frac{1}{f}$.', '$v=-60\\text{ cm}$', true),
  Q('Science', 'Light', 'True/False', 1, 'Easy', 'The speed of light in vacuum is $3\\times10^{8}$ m/s.', 'True'),
  Q('Science', 'Life Processes', 'Diagram', 3, 'Medium', 'Label the parts of the human heart in the diagram.', 'Atria, ventricles, aorta, vena cava.', true),
  Q('Science', 'Life Processes', 'Short', 2, 'Easy', 'Name the process by which green plants make food.', 'Photosynthesis'),
  Q('Physics', 'Electrostatics', 'Numerical', 3, 'Medium', 'Find the force between two $2\\,\\mu C$ charges 10 cm apart using $F=k\\frac{q_1q_2}{r^2}$.', '$3.6\\text{ N}$'),
  Q('Physics', 'Current Electricity', 'Short', 2, 'Easy', "State Ohm's law: $V=IR$.", 'V is proportional to I at constant temperature.'),
  Q('Chemistry', 'Solutions', 'Short', 2, 'Easy', 'Define molarity: $M=\\frac{n}{V}$.', 'Moles of solute per litre of solution.'),
  Q('Chemistry', 'Electrochemistry', 'Equation', 3, 'Medium', 'Identify oxidation in $\\ce{Zn + Cu^2+ -> Zn^2+ + Cu}$.', 'Zn is oxidised.')
]
export const AI_TXT = ['Simplify $\\frac{x^2-9}{x-3}$.', 'Find $\\int_0^1 x^2\\,dx$.', 'Write the balanced equation: $\\ce{N2 + 3H2 <=> 2NH3}$.', 'Explain the key idea of this chapter with a neat diagram.', 'Solve $\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}\\begin{pmatrix}x\\\\y\\end{pmatrix}=\\begin{pmatrix}5\\\\11\\end{pmatrix}$.']
export const TEMPLATES = [
  { id: 't1', name: 'Classic School Exam', cat: 'School Examination' }, { id: 't2', name: 'Unit Test Compact', cat: 'Unit Test' },
  { id: 't3', name: 'Practice Paper', cat: 'Practice Paper' }, { id: 't4', name: 'Board Style Mock', cat: 'Mock Examination' },
  { id: 't5', name: 'Coaching Weekly Test', cat: 'Coaching Institute' }, { id: 't6', name: 'Maths Paper', cat: 'Mathematics Paper' },
  { id: 't7', name: 'Science Paper', cat: 'Science Paper' }
]
export const CATS = ['All', ...TEMPLATES.map((t) => t.cat), 'My Uploaded Formats']
export const FORMATS0 = [
  { id: 'f1', name: 'DPS Annual Exam', school: 'Delhi Public School, Bhuj', last: '2026-10-02' },
  { id: 'f2', name: 'Sunrise Weekly Test', school: 'Sunrise Coaching Classes', last: '2026-09-25' }
]
const P = (id, name, board, std, subject, chapters, date, status) => ({ id, name, board, std, subject, chapters, date, status, medium: 'English', qs: [] })
export const PAPERS0 = [
  P('p1', 'Unit Test 1 - Maths', 'GSEB', 'Std 10', 'Mathematics', ['Real Numbers', 'Polynomials'], '2026-10-08', 'Draft'),
  P('p2', 'Mid-term Science', 'GSEB', 'Std 10', 'Science', ['Chemical Reactions', 'Light'], '2026-10-05', 'Completed'),
  P('p3', 'Physics Weekly Test', 'GSEB', 'Std 12', 'Physics', ['Electrostatics'], '2026-09-28', 'Completed'),
  P('p4', 'Trigonometry Practice', 'CBSE', 'Class 10', 'Mathematics', ['Trigonometry'], '2026-09-20', 'Draft'),
  P('p5', 'Old Practice Set', 'CBSE', 'Class 10', 'Science', ['Life Processes'], '2026-08-12', 'Archived')
]

export const SUBJECTS = ['Mathematics', 'Science', 'Physics', 'Chemistry']
export const EXAMS0 = [
  { id: 'e1', title: 'Unit Test 1 - Maths', subject: 'Mathematics', std: 'Std 10', date: '2026-10-15', time: '09:00', paper: 'p1' },
  { id: 'e2', title: 'Physics Weekly Test', subject: 'Physics', std: 'Std 12', date: '2026-10-20', time: '11:30', paper: 'p3' },
  { id: 'e3', title: 'Mid-term Science', subject: 'Science', std: 'Std 10', date: '2026-10-28', time: '08:30', paper: '' }
]
export const BLUEPRINTS0 = [
  { id: 'b1', name: 'GSEB Std 10 Maths - 80 marks', board: 'GSEB', std: 'Std 10', subject: 'Mathematics', rows: [{ type: 'MCQ', n: 20, m: 1 }, { type: 'Very Short', n: 6, m: 2 }, { type: 'Short', n: 4, m: 3 }, { type: 'Long', n: 9, m: 4 }], diff: { Easy: 40, Medium: 40, Hard: 20 } },
  { id: 'b2', name: 'Unit Test - 25 marks', board: '', std: '', subject: '', rows: [{ type: 'MCQ', n: 5, m: 1 }, { type: 'Short', n: 5, m: 2 }, { type: 'Long', n: 2, m: 5 }], diff: { Easy: 50, Medium: 35, Hard: 15 } }
]
export const NOTIFS0 = [
  { id: 'n1', title: 'Draft waiting', body: 'Your draft "Unit Test 1 - Maths" is not finished yet.', time: 'Today', read: false },
  { id: 'n2', title: 'Exam coming up', body: 'Unit Test 1 - Maths is scheduled for 15 Oct. Export the paper in advance.', time: 'Today', read: false },
  { id: 'n3', title: 'New templates added', body: '2 new templates are available: Board Style Mock and Coaching Weekly Test.', time: 'Yesterday', read: false },
  { id: 'n4', title: 'Tip: review AI questions', body: 'Questions marked "Needs review" should be checked before you export.', time: '3 days ago', read: true }
]
export const FAQ = [
  ['How do I create a question paper?', 'Tap Create, pick board, class, subject and chapters, set marks and question types, generate questions, choose a format and export.'],
  ['Can I use my own school format?', 'Yes. Go to Templates & My Formats, upload a DOCX or PDF, confirm the detected fields and save it. You can then pick it in the Format step.'],
  ['What is a blueprint?', 'A blueprint stores your marks distribution (how many MCQs, short and long questions, and difficulty split) so you can reuse it for every test.'],
  ['Are AI-generated questions checked?', 'AI questions are flagged "Needs review". Always read them and fix the answer before exporting.'],
  ['How do I export to Word or PDF?', 'In the last step choose Download DOCX or Download PDF. PDF uses your device print dialog - choose "Save as PDF".'],
  ['Can I change the app theme?', 'Settings > Appearance. Choose System to follow your phone, or force Light or Dark.']
]
