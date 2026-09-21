// Default game content, extracted from the original seed. The host can edit all
// of this live at /host/content; edits are saved to the state file, and this
// module is only the starting point for a fresh state.
import type { SeedContent } from './types';

export const SEED_CONTENT: SeedContent = {
  questions: [
    { order_index: 1, question: "איזה משפט מוריס אומר לפני כל ישיבה?", options: ["בואו נתחיל בזמן", "רגע, יש לי סיפור", "מי הכין קפה?", "נראה לי שסיימנו"], correct_index: 1 },
    { order_index: 2, question: "איך מוריס שותה את הקפה שלו?", options: ["שחור בלי סוכר", "הפוך עם הרבה קצף", "קר עם קרח", "לא שותה קפה בכלל"], correct_index: 0 },
    { order_index: 3, question: "מה מוריס עונה כשמישהו שואל אותו \"מה נשמע\"?", options: ["סבבה, אתה יודע", "אל תשאל...", "הכל טוב, ישיבה בעוד רגע", "תלוי באיזה יום"], correct_index: 2 },
    { order_index: 4, question: "כמה שנים מוריס ביחידה?", options: ["5 שנים", "10 שנים", "15 שנה", "20 שנה"], correct_index: 3 },
    { order_index: 5, question: "מה הכינוי שהחבר'ה נתנו למוריס?", options: ["מוריסי", "המפקד", "הפרופסור", "הקברניט"], correct_index: 0 },
    { order_index: 6, question: "איזו קבוצת כדורגל מוריס אוהד?", options: ["הפועל", "מכבי", "בית\"ר", "לא אוהד כדורגל"], correct_index: 1 },
    { order_index: 7, question: "מה מוריס תמיד שוכח להביא לישיבות?", options: ["מחשב", "עט", "הטלפון", "שום דבר, הוא תמיד מסודר"], correct_index: 2 },
    { order_index: 8, question: "מה התירוץ הכי נפוץ של מוריס לאיחור?", options: ["פקק", "ישיבה שהתארכה", "החנייה הייתה מלאה", "לא מאחר בחיים"], correct_index: 1 },
    { order_index: 9, question: "מה מוריס אומר כשמישהו מציע רעיון חדש?", options: ["בוא ננסה", "נראה לי מסובך", "זה כבר ניסינו פעם", "למה לא"], correct_index: 0 },
    { order_index: 10, question: "איזה תפקיד מוריס עשה כשהצטרף ליחידה?", options: ["מפקד צוות", "חייל מן המניין", "קצין תורן", "נהג"], correct_index: 1 },
    { order_index: 11, question: "איזו חיה הייתה למוריס בבית?", options: ["כלב", "חתול", "תוכי", "דג זהב"], correct_index: 0 },
    { order_index: 12, question: "מה מוריס מזמין תמיד כשיוצאים לאכול כמדור?", options: ["המבורגר", "שניצל", "סלט קיסר", "פסטה"], correct_index: 1 },
    { order_index: 13, question: "איך מוריס נוהג לפתוח מייל לצוות?", options: ["'חברים יקרים'", "'שלום לכולם'", "'היי צוות'", "ישר לעניין בלי פתיח"], correct_index: 3 },
    { order_index: 14, question: "מה מוריס הכי אוהב לעשות בסוף שבוע?", options: ["לטייל בטבע", "לישון עד מאוחר", "לבשל", "לצפות בספורט"], correct_index: 0 },
    { order_index: 15, question: "מה מוריס תמיד אומר בסוף ישיבה?", options: ["'נמשיך בפעם הבאה'", "'תודה לכולם, יאללה'", "'מישהו רוצה להוסיף?'", "פשוט קם והולך"], correct_index: 1 },
    { order_index: 16, question: "כמה כוסות קפה מוריס שותה ביום עבודה?", options: ["אחת", "שתיים-שלוש", "ארבע ומעלה", "בכלל לא שותה"], correct_index: 1 },
    { order_index: 17, question: "מה מוריס עשה לפני שהצטרף ליחידה?", options: ["למד באוניברסיטה", "שירת ביחידה אחרת", "עבד בהייטק", "טייל בעולם"], correct_index: 1 },
    { order_index: 18, question: "מה מוריס תמיד נושא איתו?", options: ["פנקס קטן", "בקבוק מים", "אוזניות", "סוכריות מנטה"], correct_index: 1 },
    { order_index: 19, question: "מה השיר שמוריס הכי אוהב לשיר בקריוקי?", options: ["שיר עברי קלאסי", "רוק לועזי", "היפ הופ", "לא שר בכלל"], correct_index: 0 },
    { order_index: 20, question: "מה החלום של מוריס לפרישה?", options: ["לפתוח בית קפה", "לטייל בעולם", "לגדל כלבים", "לנוח בבית עם המשפחה"], correct_index: 1 },
  ],
  stories: [
    { order_index: 1, story: "מוריס פעם ענה לטלפון באמצע ריצת 10 ק\"מ ולא האט את הקצב.", is_true: true },
    { order_index: 2, story: "מוריס זכה פעם בתחרות שירה בקריוקי של היחידה.", is_true: true },
    { order_index: 3, story: "מוריס גידל פעם שפם למשך שנה שלמה בלי שאף אחד שם לב.", is_true: false },
    { order_index: 4, story: "מוריס הגיע פעם לעבודה עם שתי נעליים לא תואמות ולא שם לב עד הצהריים.", is_true: true },
    { order_index: 5, story: "מוריס פעם שכח את שם הכלב שלו בטופס רשמי.", is_true: false },
  ],
  words: [
    { order_index: 1, word: "ענף" },
    { order_index: 2, word: "משאבים" },
    { order_index: 3, word: "שיבר" },
    { order_index: 4, word: "7170" },
    { order_index: 5, word: "קלוד קוד" },
    { order_index: 6, word: "אנשים של אנשים" },
    { order_index: 7, word: "מוריסי" },
    { order_index: 8, word: "20 שנה ביחידה" },
  ],
};
