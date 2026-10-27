import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function RichText({ text }: { text: string }) {
  return (
    <div className="prose rich-text">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>
        {text}
      </Markdown>
    </div>
  );
}
