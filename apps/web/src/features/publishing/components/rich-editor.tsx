"use client";
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { Node, type JSONContent } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  ImagePlus,
  Undo2,
  Redo2,
  Link as LinkIcon,
} from "lucide-react";
import type { RichNode } from "@/lib/contracts";
const AssetImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      assetId: { default: null },
      alt: { default: "" },
      caption: { default: null },
      href: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure[data-asset-id]",
        getAttrs: (element) => ({
          assetId: element.getAttribute("data-asset-id"),
          alt: element.getAttribute("alt"),
          caption: element.querySelector("figcaption")?.textContent ?? "",
          href: element.getAttribute("data-href") ?? "",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "figure",
      {
        "data-asset-id": node.attrs.assetId,
        alt: node.attrs.alt,
        "data-href": node.attrs.href,
      },
      ["img", { src: "/api/v1/admin/media/" + node.attrs.assetId, alt: node.attrs.alt }],
      ["figcaption", {}, node.attrs.caption ?? node.attrs.alt],
    ];
  },
});
const InlineAssetImage = AssetImage.extend({
  name: "inlineImage",
  group: "inline",
  inline: true,
  parseHTML() {
    return [
      {
        tag: "img[data-inline-asset-id]",
        getAttrs: (el) => ({
          assetId: el.getAttribute("data-inline-asset-id"),
          alt: el.getAttribute("alt"),
          caption: "",
          href: "",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "img",
      {
        "data-inline-asset-id": node.attrs.assetId,
        src: "/api/v1/admin/media/" + node.attrs.assetId,
        alt: node.attrs.alt,
        class: "inline-image",
      },
    ];
  },
});
// Remove optional null attributes produced by ProseMirror (e.g. codeBlock.language).
function clean(document: JSONContent): RichNode {
  return JSON.parse(
    JSON.stringify(document, (_key, value) => (value === null ? undefined : value)),
  ) as RichNode;
}
export type RichEditorHandle = { insertImage: (id: string, alt: string) => void };
export const RichEditor = forwardRef<
  RichEditorHandle,
  {
    initial: RichNode;
    onChange: (document: RichNode) => void;
    onImage: () => void;
    disabled: boolean;
  }
>(function RichEditor({ initial, onChange, onImage, disabled }, ref) {
  const change = useRef(onChange);
  change.current = onChange;
  const [linkOpen, setLinkOpen] = useState(false),
    [href, setHref] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4, 5, 6] }, link: { openOnClick: false } }),
      TableKit.configure({ table: { resizable: true, renderWrapper: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      AssetImage,
      InlineAssetImage,
      Placeholder.configure({ placeholder: "Bắt đầu câu chuyện của bạn tại đây…" }),
    ],
    content: initial as JSONContent,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "prose editor-prose",
        role: "textbox",
        "aria-label": "Nội dung bài viết",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => change.current(clean(current.getJSON())),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useImperativeHandle(
    ref,
    () => ({
      insertImage: (id, alt) => {
        editor
          ?.chain()
          .focus()
          .insertContent({ type: "image", attrs: { assetId: id, alt, caption: "", href: "" } })
          .run();
      },
    }),
    [editor],
  );
  const commands = [
    {
      label: "In đậm",
      Icon: Bold,
      active: editor?.isActive("bold"),
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "In nghiêng",
      Icon: Italic,
      active: editor?.isActive("italic"),
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Đề mục cấp 2",
      Icon: Heading2,
      active: editor?.isActive("heading", { level: 2 }),
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Đề mục cấp 3",
      Icon: Heading3,
      active: editor?.isActive("heading", { level: 3 }),
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Danh sách",
      Icon: List,
      active: editor?.isActive("bulletList"),
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Danh sách đánh số",
      Icon: ListOrdered,
      active: editor?.isActive("orderedList"),
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Trích dẫn",
      Icon: Quote,
      active: editor?.isActive("blockquote"),
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
  ];
  return (
    <div className="rich-editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Định dạng bài viết">
        {commands.map(({ label, Icon, active, run }) => (
          <button
            type="button"
            key={label}
            aria-label={label}
            title={label}
            aria-pressed={!!active}
            onClick={run}
            disabled={!editor || disabled}
          >
            <Icon size={18} />
          </button>
        ))}
        <span className="toolbar-divider" />
        <button
          type="button"
          aria-label="Chèn liên kết"
          title="Chèn liên kết"
          disabled={disabled}
          onClick={() => {
            setHref(editor?.getAttributes("link").href ?? "");
            setLinkOpen(!linkOpen);
          }}
        >
          <LinkIcon size={18} />
        </button>
        <button
          type="button"
          aria-label="Chèn ảnh vào nội dung"
          title="Chèn ảnh"
          disabled={disabled}
          onClick={onImage}
        >
          <ImagePlus size={18} />
        </button>
        <span className="toolbar-spacer" />
        <button
          type="button"
          aria-label="Hoàn tác"
          disabled={disabled || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={18} />
        </button>
        <button
          type="button"
          aria-label="Làm lại"
          disabled={disabled || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={18} />
        </button>
      </div>
      <div className="editor-structure-toolbar" role="toolbar" aria-label="Cấu trúc nội dung">
        <select
          aria-label="Kiểu đoạn văn"
          disabled={disabled || !editor}
          value={editor?.isActive("heading") ? String(editor.getAttributes("heading").level) : "p"}
          onChange={(e) =>
            e.target.value === "p"
              ? editor?.chain().focus().setParagraph().run()
              : editor
                  ?.chain()
                  .focus()
                  .setHeading({ level: Number(e.target.value) as 2 | 3 | 4 | 5 | 6 })
                  .run()
          }
        >
          <option value="p">Đoạn văn</option>
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              Đề mục cấp {n}
            </option>
          ))}
        </select>
        <select
          aria-label="Căn lề đoạn văn"
          disabled={disabled || !editor}
          value={
            editor?.getAttributes(editor.isActive("heading") ? "heading" : "paragraph").textAlign ??
            "left"
          }
          onChange={(e) => editor?.chain().focus().setTextAlign(e.target.value).run()}
        >
          <option value="left">Căn trái</option>
          <option value="center">Căn giữa</option>
          <option value="right">Căn phải</option>
          <option value="justify">Căn đều</option>
        </select>
        <button
          type="button"
          disabled={disabled || !editor}
          aria-pressed={editor?.isActive("subscript") ?? false}
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
        >
          Chỉ số dưới
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          aria-pressed={editor?.isActive("superscript") ?? false}
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
        >
          Chỉ số trên
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          Chèn bảng
        </button>
      </div>
      {editor?.isActive("table") && (
        <div className="editor-structure-toolbar" role="toolbar" aria-label="Chỉnh bảng">
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            Thêm hàng
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            Xóa hàng
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            Thêm cột
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            Xóa cột
          </button>
          <button
            type="button"
            disabled={disabled || !editor.can().mergeCells()}
            onClick={() => editor.chain().focus().mergeCells().run()}
          >
            Gộp ô
          </button>
          <button
            type="button"
            disabled={disabled || !editor.can().splitCell()}
            onClick={() => editor.chain().focus().splitCell().run()}
          >
            Tách ô
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            Hàng tiêu đề
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            Xóa bảng
          </button>
        </div>
      )}
      {editor?.isActive("image") && (
        <fieldset className="editor-image-fields" disabled={disabled}>
          <legend>Ảnh đang chọn</legend>
          <label>
            Mô tả ảnh trong bài
            <input
              maxLength={300}
              value={editor.getAttributes("image").alt ?? ""}
              onChange={(e) => editor.commands.updateAttributes("image", { alt: e.target.value })}
            />
          </label>
          <label>
            Chú thích ảnh
            <input
              maxLength={2000}
              value={editor.getAttributes("image").caption ?? ""}
              onChange={(e) =>
                editor.commands.updateAttributes("image", { caption: e.target.value })
              }
            />
          </label>
          <label>
            Liên kết khi bấm ảnh
            <input
              type="url"
              value={editor.getAttributes("image").href ?? ""}
              onChange={(e) => editor.commands.updateAttributes("image", { href: e.target.value })}
            />
          </label>
          <button type="button" onClick={() => editor.chain().focus().deleteSelection().run()}>
            Xóa ảnh khỏi bài
          </button>
        </fieldset>
      )}
      {linkOpen && (
        <div className="link-form">
          <input
            aria-label="Đường dẫn liên kết"
            placeholder="https://…"
            value={href}
            onChange={(e) => setHref(e.target.value)}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              if (href) editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
              else editor?.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Áp dụng
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
});
