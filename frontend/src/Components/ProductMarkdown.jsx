import { useLanguage } from "../contexts/LanguageContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ProductMarkdown.css";

const components = {
  table: function MarkdownTable({ children }) {
    const { t } = useLanguage();
    return (
      <div className="product-markdown-table" role="region" aria-label={t("Product information table")} tabIndex={0}>
        <table>{children}</table>
      </div>
    );
  },
};

export default function ProductMarkdown({ children }) {
  return (
    <div className="product-markdown" dir="auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
