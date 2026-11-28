export interface LocalizedText {
  readonly ar: string;
  readonly en: string;
}

export interface LegalBookletClause {
  readonly heading: LocalizedText;
  readonly body: LocalizedText;
}

export interface LegalBookletChapter {
  readonly id: string;
  readonly index: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly clauses: readonly LegalBookletClause[];
  readonly highlightNote?: LocalizedText;
}

export interface LegalBookletDocument {
  readonly documentCode: string;
  readonly edition: LocalizedText;
  readonly eyebrow: LocalizedText;
  readonly title: LocalizedText;
  readonly subtitle: LocalizedText;
  readonly chapters: readonly LegalBookletChapter[];
}

export const legalBooklet: LegalBookletDocument = {
  documentCode: "BRJ-LEG-01",
  edition: { ar: "نسخة تعريفية", en: "Reader’s preview" },
  eyebrow: { ar: "دليل المشاركة", en: "Participation guide" },
  title: { ar: "الكراسة القانونية للمبادرة", en: "The Initiative Legal Booklet" },
  subtitle: {
    ar: "دليل لمراحل المشاركة، من التحقق من الأهلية إلى الاستلام. تسري الشروط المنشورة للمشروع على إجراءات المشاركة.",
    en: "A guide to participation, from eligibility to handover. The published project terms govern participation.",
  },
  chapters: [
    {
      id: "eligibility",
      index: "01",
      title: { ar: "تعريف المبادرة والأهلية", en: "Initiative and eligibility" },
      summary: { ar: "تعرّف على نطاق المبادرة ومن يمكنه التقدّم قبل إعداد مستنداتك.", en: "Understand the initiative and who can apply before preparing your documents." },
      clauses: [
        {
          heading: { ar: "نطاق المبادرة", en: "Scope of the initiative" },
          body: {
            ar: "توضح نشرة كل مشروع الوحدات المطروحة ومراحل المشاركة والمستندات المرجعية التي تخصه.",
            en: "Each project notice sets out the available units, participation stages and documents for that project.",
          },
        },
        {
          heading: { ar: "مراجعة الأهلية", en: "Checking eligibility" },
          body: {
            ar: "راجع شروط الأهلية وقائمة المستندات في إعلان الطرح قبل تقديم طلب الحجز.",
            en: "Check the eligibility criteria and required documents in the project notice before applying to reserve a unit.",
          },
        },
      ],
    },
    {
      id: "reservation",
      index: "02",
      title: { ar: "آلية الحجز والقرعة العلنية", en: "Reservations and the public draw" },
      summary: { ar: "تابع مراحل الطلب والجدول المعلن للتخصيص في المشروع الذي تختاره.", en: "Follow the application stages and published allocation schedule for your chosen project." },
      clauses: [
        {
          heading: { ar: "تقديم طلب الحجز", en: "Submitting a reservation request" },
          body: {
            ar: "اتبع قناة الحجز الموضّحة في إعلان الطرح، واحتفظ بمرجع الطلب والمراسلات المرتبطة به.",
            en: "Use the reservation channel listed in the project notice and keep the application reference and correspondence.",
          },
        },
        {
          heading: { ar: "إجراءات القرعة", en: "Draw procedure" },
          body: {
            ar: "عند تطبيق القرعة، يوضّح إعلان المشروع طريقة إجرائها وكيفية إعلان النتيجة والخطوات التالية.",
            en: "Where a draw applies, the notice explains how it is run, how results are communicated and what follows.",
          },
        },
      ],
    },
    {
      id: "payments",
      index: "03",
      title: { ar: "خطط السداد والضمانات المالية", en: "Payment plans and safeguards" },
      summary: { ar: "راجع التزامات السداد والمستندات المالية الخاصة بالوحدة قبل إتمام التعاقد.", en: "Review the unit’s payment obligations and financial documents before completing the contract." },
      clauses: [
        {
          heading: { ar: "جدول الدفعات", en: "Payment schedule" },
          body: {
            ar: "راجع قيمة كل دفعة وتاريخ استحقاقها وقناة السداد في المستندات المعتمدة للمشروع.",
            en: "Check each instalment amount, due date and payment channel in the published project documents.",
          },
        },
        {
          heading: { ar: "إثباتات السداد", en: "Payment records" },
          body: {
            ar: "احتفظ بإيصالات السداد وراجع ما يورده العقد بشأن التسويات والاسترداد والضمانات المتاحة.",
            en: "Keep your receipts and refer to the contract for any adjustments, refunds and safeguards that apply.",
          },
        },
      ],
    },
    {
      id: "handover",
      index: "04",
      title: { ar: "الاستلام والحقوق القانونية", en: "Handover and participant rights" },
      summary: { ar: "استعد لمعاينة الوحدة واستلامها، واحتفظ بالمستندات التي تحدد حقوقك والتزاماتك.", en: "Prepare for inspection and handover, and keep the documents that set out your rights and obligations." },
      clauses: [
        {
          heading: { ar: "معاينة الوحدة", en: "Inspecting the unit" },
          body: {
            ar: "راجع إشعار الاستلام ومواصفات الوحدة، ودوّن ملاحظات المعاينة وفق الإجراء الوارد في العقد.",
            en: "Review the handover notice and unit specifications, and record inspection findings using the contract procedure.",
          },
        },
        {
          heading: { ar: "مراجعة العقد", en: "Consulting the contract" },
          body: {
            ar: "ارجع إلى العقد والشروط المنشورة لمعرفة نطاق الالتزامات وقنوات الاستفسار وتقديم الملاحظات.",
            en: "Consult the contract and published terms for the obligations that apply and the channels for questions or concerns.",
          },
        },
      ],
      highlightNote: { ar: "احتفظ بنسخ من العقد ومحضر الاستلام والمراسلات للرجوع إليها.", en: "Keep copies of your contract, handover record and correspondence for reference." },
    },
  ],
};
