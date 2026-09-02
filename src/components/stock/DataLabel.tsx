// `data-label` from the Precision Logic type scale (doc/stitch/): 12px / 700 / uppercase
// / 0.05em tracking.
//
// The design system is explicit that this is not decoration — "all data identifiers
// (Invoices, SKUs) must use the data-label style in uppercase to distinguish them from
// descriptive text". It does two jobs:
//   * a section heading in the filter screen ("STATUS", "TIMELINE")
//   * a field label above its value in the Deliveries card ("INVOICE", "CUSTOMER")
//
// `SectionTitle` in ./index stays as it is — it carries its own screen padding and is used
// by the detail screens. This is the bare inline primitive.
import React from "react";
import { Text } from "react-native";

export default function DataLabel({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <Text className={`text-[12px] font-bold uppercase tracking-wider text-gray-500 ${className}`} numberOfLines={1}>
      {children}
    </Text>
  );
}
