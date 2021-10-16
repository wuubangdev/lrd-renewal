"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, CornerDownRight, PanelsTopLeft } from "lucide-react";
import { Field, LinkField, MoveButtons, moveItem } from "./fields";
import type { MenuItem, NavigationMenu } from "./contracts";

function newItem(): MenuItem {
  return { id: crypto.randomUUID(), label: "", link: { kind: "NEWS", target: "" }, children: [] };
}
export function MenuForm({
  value,
  onChange,
  locale,
}: {
  value: NavigationMenu;
  onChange: (v: NavigationMenu) => void;
  locale: string;
}) {
  const items = value.items;
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  useEffect(() => {
    if (!items.some((item) => item.id === selectedId)) setSelectedId(items[0]?.id ?? "");
  }, [items, selectedId]);
  const selected = items.find((item) => item.id === selectedId);
  const count = items.reduce((n, item) => n + 1 + item.children.length, 0);
  function update(item: MenuItem) {
    onChange({ items: items.map((x) => (x.id === item.id ? item : x)) });
  }
  function addParent() {
    const item = newItem();
    onChange({ items: [...items, item] });
    setSelectedId(item.id);
  }
  function removeParent(item: MenuItem) {
    if (
      !window.confirm(
        `Xóa “${item.label || "mục chưa đặt tên"}” và ${item.children.length} mục con?`,
      )
    )
      return;
    onChange({ items: items.filter((x) => x.id !== item.id) });
    setSelectedId(items.find((x) => x.id !== item.id)?.id ?? "");
  }
  return (
    <div className="menu-workspace">
      <div className="menu-intro">
        <div>
          <h2>Điều hướng chính</h2>
          <p>
            Chọn một mục để sửa tên, đích liên kết và các mục con. Dùng nút mũi tên để đổi thứ tự.
          </p>
        </div>
        <span>
          {items.length}/8 mục chính · {count}/40 mục tổng
        </span>
      </div>
      <div className="menu-workspace-grid">
        <nav className="menu-outline" aria-label="Danh sách mục menu">
          {items.map((item, index) => (
            <div
              className={"menu-outline-item" + (selectedId === item.id ? " selected" : "")}
              key={item.id}
            >
              <button
                type="button"
                className="menu-outline-select"
                aria-current={selectedId === item.id ? "true" : undefined}
                onClick={() => setSelectedId(item.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label || "Mục chưa đặt tên"}</strong>
                <small>
                  {item.children.length ? `${item.children.length} mục con` : "Liên kết đơn"}
                </small>
              </button>
              <MoveButtons
                index={index}
                length={items.length}
                label={item.label || "mục menu"}
                onMove={(to) => onChange({ items: moveItem(items, index, to) })}
              />
            </div>
          ))}
          {!items.length && (
            <p className="menu-outline-empty">Chưa có mục menu. Thêm mục đầu tiên để bắt đầu.</p>
          )}
          <button
            type="button"
            className="button secondary menu-add"
            disabled={items.length >= 8 || count >= 40}
            onClick={addParent}
          >
            <Plus size={17} /> Thêm mục chính
          </button>
        </nav>
        <section className="menu-detail" aria-label="Sửa mục menu">
          {selected ? (
            <>
              <div className="menu-detail-heading">
                <div>
                  <p className="eyebrow">ĐANG CHỈNH SỬA</p>
                  <h3>{selected.label || "Mục chưa đặt tên"}</h3>
                </div>
                <button
                  type="button"
                  className="icon-button danger-text"
                  aria-label={`Xóa menu ${selected.label}`}
                  onClick={() => removeParent(selected)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="menu-detail-fields">
                <Field
                  label="Tên hiển thị"
                  max={80}
                  value={selected.label}
                  onChange={(label) => update({ ...selected, label })}
                />
                <LinkField
                  value={selected.link}
                  onChange={(link) => update({ ...selected, link })}
                  locale={locale}
                  allowGroup
                />
              </div>
              <div className="menu-children-heading">
                <div>
                  <h4>Mục con</h4>
                  <p>Hiển thị trong menu xổ xuống của mục chính.</p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={selected.children.length >= 10 || count >= 40}
                  onClick={() =>
                    update({ ...selected, children: [...selected.children, newItem()] })
                  }
                >
                  <Plus size={16} /> Thêm mục con
                </button>
              </div>
              {selected.children.map((child, index) => (
                <details className="menu-child-detail" key={child.id}>
                  <summary>
                    <CornerDownRight size={16} />
                    <strong>{child.label || `Mục con ${index + 1}`}</strong>
                    <span>
                      {index + 1}/{selected.children.length}
                    </span>
                  </summary>
                  <div className="menu-child-detail-body">
                    <div className="item-toolbar">
                      <MoveButtons
                        index={index}
                        length={selected.children.length}
                        label={child.label || "mục con"}
                        onMove={(to) =>
                          update({ ...selected, children: moveItem(selected.children, index, to) })
                        }
                      />
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Xóa mục con ${child.label}`}
                        onClick={() =>
                          update({
                            ...selected,
                            children: selected.children.filter((x) => x.id !== child.id),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <Field
                      label="Tên mục con"
                      max={80}
                      value={child.label}
                      onChange={(label) =>
                        update({
                          ...selected,
                          children: selected.children.map((x) =>
                            x.id === child.id ? { ...x, label } : x,
                          ),
                        })
                      }
                    />
                    <LinkField
                      value={child.link}
                      onChange={(link) =>
                        update({
                          ...selected,
                          children: selected.children.map((x) =>
                            x.id === child.id ? { ...x, link } : x,
                          ),
                        })
                      }
                      locale={locale}
                    />
                  </div>
                </details>
              ))}
              {selected.link.kind === "GROUP" && !selected.children.length && (
                <p className="field-hint">Nhóm menu cần ít nhất một mục con trước khi đăng.</p>
              )}
            </>
          ) : (
            <div className="menu-detail-empty">
              <PanelsTopLeft size={34} />
              <p>Chọn một mục ở bên trái để chỉnh sửa.</p>
            </div>
          )}
        </section>
      </div>
      <section className="menu-structure" aria-label="Cấu trúc menu hiện tại">
        <h3>Cấu trúc đang soạn</h3>
        <div>
          {items.map((item) => (
            <div key={item.id}>
              <strong>{item.label || "Mục chưa đặt tên"}</strong>
              {!!item.children.length && (
                <ul>
                  {item.children.map((child) => (
                    <li key={child.id}>{child.label || "Mục con chưa đặt tên"}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p>
          Để xem giao diện website chính xác, bấm <strong>Xem trước</strong> ở thanh công cụ.
        </p>
      </section>
    </div>
  );
}
