/** プライバシーポリシー(設定 > 規約とプライバシー から開く) */
import React from "react";

import { LegalDocument } from "@/src/components/legal/LegalDocument";
import { PRIVACY_LEAD, PRIVACY_SECTIONS } from "@/src/lib/legal";

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="プライバシーポリシー"
      lead={PRIVACY_LEAD}
      sections={PRIVACY_SECTIONS}
    />
  );
}
