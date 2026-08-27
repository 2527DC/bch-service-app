import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function CourseDetailRedirect() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return <Redirect href={`/lms/learn/${courseId || ""}` as never} />;
}
