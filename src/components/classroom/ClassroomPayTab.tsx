"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StoreItem = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  imageUrl: string | null;
};

type Props = { classroomId: string };

type Receipt = {
  total: number;
  balance: number;
  student: { id: string; name: string; number: number | null };
  items: { id: string; name: string; price: number; qty: number }[];
};

export function ClassroomPayTab({ classroomId }: Props) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/classrooms/${classroomId}/store/items`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { items: StoreItem[] };
    setItems(data.items);
  }, [classroomId]);

  useEffect(() => {
    load();
  }, [load]);

  const cartList = useMemo(() => {
    return items
      .filter((it) => cart[it.id] && cart[it.id] > 0)
      .map((it) => ({ ...it, qty: cart[it.id] }));
  }, [items, cart]);
  const total = cartList.reduce((sum, it) => sum + it.price * it.qty, 0);

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function changeQty(id: string, delta: number) {
    setCart((c) => {
      const next = (c[id] ?? 0) + delta;
      if (next <= 0) {
        const copy = { ...c };
        delete copy[id];
        return copy;
      }
      return { ...c, [id]: next };
    });
  }
  function clearCart() {
    setCart({});
    setToken("");
    setError(null);
  }

  async function handleCharge() {
    if (cartList.length === 0 || !token.trim()) {
      setError("카트와 카드 QR 토큰 필수");
      return;
    }
    setBusy(true);
    setError(null);
    setReceipt(null);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/store/charge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cardQrToken: token.trim(),
          items: cartList.map((it) => ({ itemId: it.id, qty: it.qty })),
        }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error;
        setError(typeof msg === "string" ? msg : "결제 실패");
        return;
      }
      const data = await res.json();
      setReceipt({
        total: data.total,
        balance: data.balance,
        student: data.student,
        items: data.items,
      });
      clearCart();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="classroom-pay">
      <div className="pay-grid">
        <div className="pay-catalog">
          <h3>상품</h3>
          {items.length === 0 ? (
            <p className="pay-empty">등록된 상품이 없어요. 매점 관리에서 추가하세요.</p>
          ) : (
            <ul className="pay-item-grid">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className="pay-item-btn"
                    onClick={() => addToCart(it.id)}
                    disabled={it.stock === 0}
                  >
                    {it.imageUrl && (
                      <img src={it.imageUrl} alt="" width={120} height={80} />
                    )}
                    <div className="pay-item-name">{it.name}</div>
                    <div className="pay-item-price">
                      {it.price.toLocaleString()}원
                    </div>
                    {it.stock !== null && (
                      <div className="pay-item-stock">
                        재고 {it.stock}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="pay-cart">
          <div className="pay-cart-header">
            <h3>카트</h3>
            <span className="pay-cart-total">
              {total.toLocaleString()}원
            </span>
          </div>
          {cartList.length === 0 ? (
            <p className="pay-cart-empty">카트가 비어있어요.</p>
          ) : (
            <ul className="pay-cart-list">
              {cartList.map((it) => (
                <li key={it.id} className="pay-cart-row">
                  <span className="pay-cart-name">{it.name}</span>
                  <div className="pay-cart-qty">
                    <button type="button" onClick={() => changeQty(it.id, -1)}>
                      −
                    </button>
                    <span>{it.qty}</span>
                    <button type="button" onClick={() => changeQty(it.id, +1)}>
                      +
                    </button>
                  </div>
                  <span className="pay-cart-sub">
                    {(it.price * it.qty).toLocaleString()}원
                  </span>
                </li>
              ))}
            </ul>
          )}

          <label className="pay-token-field">
            <span>학생 카드 QR 토큰</span>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="학생 화면의 QR을 스캔하거나 토큰 문자열을 붙여넣기"
              rows={3}
              disabled={busy}
            />
          </label>

          {error && <p className="pay-error">{error}</p>}

          <div className="pay-cart-actions">
            <button
              type="button"
              className="pay-cart-clear"
              onClick={clearCart}
              disabled={busy || cartList.length === 0}
            >
              카트 비우기
            </button>
            <button
              type="button"
              className="pay-cart-charge"
              onClick={handleCharge}
              disabled={busy || cartList.length === 0 || !token.trim()}
            >
              {busy ? "처리 중…" : `${total.toLocaleString()}원 결제`}
            </button>
          </div>
        </aside>
      </div>

      {receipt && (
        <div
          className="modal-backdrop"
          onClick={() => setReceipt(null)}
          role="dialog"
          aria-modal="true"
          aria-label="결제 완료"
        >
          <div className="pay-receipt">
            <h3>✅ 결제 완료</h3>
            <p>
              <strong>{receipt.student.name}</strong>님 · 결제 후 잔액{" "}
              <strong>{receipt.balance.toLocaleString()}원</strong>
            </p>
            <ul className="pay-receipt-items">
              {receipt.items.map((it) => (
                <li key={it.id}>
                  {it.name} × {it.qty} ={" "}
                  {(it.price * it.qty).toLocaleString()}원
                </li>
              ))}
            </ul>
            <div className="pay-receipt-total">
              총액 {receipt.total.toLocaleString()}원
            </div>
            <button
              type="button"
              className="pay-receipt-close"
              onClick={() => setReceipt(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
