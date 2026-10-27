import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ProductMarkdown.css";

const components = {
  table: function MarkdownTable({ children }) {
    return (
      <div className="product-markdown-table" role="region" aria-label="Product information table" tabIndex={0}>
        <table>{children}</table>
      </div>
    );
  },
};

export default function ProductMarkdown({ children }) {
  return (
    <div className="product-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
