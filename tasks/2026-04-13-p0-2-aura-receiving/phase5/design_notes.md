# Phase 5 — Designer output (JSX skeleton delivered in phase7)

Skeleton delivered directly to coder phase. No separate `.tsx` in tasks/ — implementation lives in `src/app/account/tokens/TokensClient.tsx`.

## Key component shape
```tsx
export default function TokensClient({ initial }: { initial: TokenRow[] }) {
  const [rows, setRows] = useState(initial);
  const [openIssue, setOpenIssue] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  // ... issue/revoke handlers
}
```

## Tailwind classes locked
- Page wrapper: `mx-auto max-w-3xl p-6 space-y-6`
- Header: `text-2xl font-semibold`
- Subtitle: `text-sm text-slate-600`
- Table: `w-full border-collapse text-sm`
- Table row hover: `hover:bg-slate-50`
- New-token dialog banner: `rounded-md bg-amber-50 border border-amber-200 text-amber-900 p-3 text-sm`
- Copy button active: `ring-2 ring-blue-500`

## Delivered to phase6 reviewer
Designer confirms all elements match `docs/design-system.md` tokens. No new tokens introduced.
