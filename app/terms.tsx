/** 利用規約(設定 > 規約とプライバシー から開く) */
import React from "react";

import { LegalDocument } from "@/src/components/legal/LegalDocument";
import { TERMS_LEAD, TERMS_SECTIONS } from "@/src/lib/legal";

export default function TermsScreen() {
  return (
    <LegalDocument title="利用規約" lead={TERMS_LEAD} sections={TERMS_SECTIONS} />
  );
}
