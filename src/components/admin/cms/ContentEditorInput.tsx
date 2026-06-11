"use client";

import { useState } from "react";
import DynamicEditor from "./DynamicEditor";

export function ContentEditorInput({ initialContent, name }: { initialContent?: string | null, name: string }) {
  const [content, setContent] = useState(initialContent || "");

  return (
    <>
      <input type="hidden" name={name} value={content} />
      <DynamicEditor initialContent={initialContent} onChange={(newContent) => setContent(newContent)} />
    </>
  );
}
