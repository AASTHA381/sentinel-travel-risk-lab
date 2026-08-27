import { AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react'

export const decisionCopy = {
  approve: { label: 'Approve', icon: ShieldCheck },
  review: { label: 'Manual review', icon: AlertTriangle },
  block: { label: 'Block', icon: ShieldX },
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`
}
