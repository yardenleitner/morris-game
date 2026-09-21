// Default game content, extracted from the original seed. The host can edit all
// of this live at /host/content; edits are saved to the state file, and this
// module is only the starting point for a fresh state.
import type { SeedContent } from './types';

// Trivia questions are transcribed from "מי מכיר את מוריס - שאלות לשעשועון.xlsx";
// correct_index is the position of that row's "תשובה נכונה" column among its four
// options, so the sheet stays the single source of truth for the answer key.
export const SEED_CONTENT: SeedContent = {
  questions: [
    { order_index: 1, question: "איפה מוריס גר?", options: ["טל שחר", "קיבוץ נען", "מזכרת בתיה", "רחובות"], correct_index: 2 },
    { order_index: 2, question: "מה היה התפקיד הראשון של מוריס ביחידה?", options: ["אחראי רשתות", "מפתח Low", "חייל בצוות חמל", "מפתח מערכות ניטור"], correct_index: 0 },
    { order_index: 3, question: "כמה צוותים נפתחו ונסגרו בענף בתקופתו של מוריס?", options: ["7", "6", "4", "5"], correct_index: 0 },
    { order_index: 4, question: "איזה שם אינו מופיע במשפחה המצומצמת של מוריס?", options: ["נועה", "אלי", "חוה", "אביב"], correct_index: 3 },
    { order_index: 5, question: "באיזה קצב מוריס רץ את הבר־אור בקצונה?", options: ["3:39 לק\"מ", "4:00 לק\"מ", "4:30 לק\"מ", "3:55 לק\"מ"], correct_index: 3 },
    { order_index: 6, question: "באיזו עיר מוריס נולד?", options: ["חולון", "רחובות", "רמת גן", "פתח תקווה"], correct_index: 1 },
    { order_index: 7, question: "איך כינו את מוריס בבה״ד 1?", options: ["מוריס", "יוסיין", "בן מוזס", "ביג M"], correct_index: 0 },
    { order_index: 8, question: "על כמה תחומים שונים היה מוריס אחראי לאורך הקריירה?", options: ["1", "2", "3", "4"], correct_index: 1 },
    { order_index: 9, question: "במה ואיפה עשה מוריס את התואר?", options: ["מדמ\"ח בפתוחה", "הנדסת חשמל בHIT בחולון", "הנדסת חשמל בMIT בקיימברידג'", "הנדסת חשמל בטכניון"], correct_index: 1 },
    { order_index: 10, question: "מה היה התפקיד האחרון של מוריס לפני שהגיע ל־450?", options: ["רת״ח ב־7180", "מ״פ רמון בקמ״נים", "רע״ן במצו״ב", "היה בלימודים"], correct_index: 0 },
    { order_index: 11, question: "ממה מוריס מפחד?", options: ["חללים סגורים וצפופים", "משאבי Spark", "נחשים", "גבהים"], correct_index: 3 },
    { order_index: 12, question: "מה הדבר שמוריס הכי אוהב לעשות בסוף שבוע?", options: ["עגלת קפה", "יוגה עם חוה", "קלוד", "לנגן עם חברים"], correct_index: 0 },
    { order_index: 13, question: "על איזה תפקיד מוריס ויתר, או איזו הצעה דחה, לטובת המשך העשייה ביחידה?", options: ["רע\"ן מפקדים", "סגן יעודי 7190", "אל\"מ בתקשוב", "יועץ טכנולוגי באלביט"], correct_index: 2 },
    { order_index: 14, question: "איזה ממונחי הבריין רוט הבאים נאמר באמת על ידי מוריס?", options: ["סיקס סבן", "לוק אין", "אורה פארמינג", "רק בפתח תקווה"], correct_index: 0 },
    { order_index: 15, question: "איזה ביטוי מוריס אומר הכי הרבה?", options: ["זה המתח", "אני המצאתי את ה%S", "זה לא אישי", "אני ו%S חברים ממש טובים למרות שגרטתי לו את הענף"], correct_index: 0 },
    { order_index: 16, question: "מה מוריס מתכנן לעשות באזרחות?", options: ["סטארטאפ עם מרקוס", "לצאת לטיול הגדול", "פוליטיקה", "לא יודע עדיין"], correct_index: 3 },
    { order_index: 17, question: "באיזה צבע מברשת השיניים של מוריס?", options: ["כחול", "ירוק", "מברשת חשמלית מונעת בAI", "אפור"], correct_index: 0 },
    { order_index: 18, question: "מה המדור האהוב על מוריס?", options: ["458", "456", "452", "457 (תגלו עליו בשבוע הבא)"], correct_index: 0 },
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
